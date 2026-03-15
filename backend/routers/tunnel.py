"""
Tunnel & Network router
- GET  /api/tunnel/network   → all local IPs + Tailscale IP
- POST /api/tunnel/start     → start ngrok tunnels, return public URLs + QR
- POST /api/tunnel/stop      → kill ngrok tunnels
- GET  /api/tunnel/status    → current tunnel URLs
"""
from fastapi import APIRouter
from fastapi.responses import Response
import socket, subprocess, re, io, threading

router  = APIRouter()
_state  = {"tunnels": [], "active": False, "error": ""}

# ── helpers ────────────────────────────────────────────────────

def _local_ips():
    ips = []
    try:
        # all interfaces
        out = subprocess.run(["ipconfig" if __import__("sys").platform == "win32" else "ip","addr"],
                             capture_output=True, text=True, timeout=5).stdout
        for m in re.finditer(r'(?:inet |IPv4[^:]*:)\s*([\d.]+)', out):
            ip = m.group(1)
            if not ip.startswith("127.") and not ip.startswith("169."):
                ips.append(ip)
    except:
        pass
    # fallback via socket
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.append(s.getsockname()[0])
        s.close()
    except:
        pass
    return list(dict.fromkeys(ips))  # deduplicate, preserve order

def _tailscale_ip():
    try:
        out = subprocess.run(["tailscale", "ip", "-4"],
                             capture_output=True, text=True, timeout=5).stdout.strip()
        if re.match(r'^\d+\.\d+\.\d+\.\d+$', out):
            return out
    except:
        pass
    return None

def _make_qr(url: str) -> str:
    """Return base64 PNG data-URI of a QR code."""
    try:
        import qrcode, base64
        qr = qrcode.QRCode(box_size=4, border=2,
                           error_correction=qrcode.constants.ERROR_CORRECT_L)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:image/png;base64,{b64}"
    except Exception as e:
        return ""

# ── endpoints ──────────────────────────────────────────────────

@router.get("/network")
def network_info():
    local_ips = _local_ips()
    tailscale  = _tailscale_ip()
    hostname   = socket.gethostname()
    return {
        "hostname":   hostname,
        "local_ips":  local_ips,
        "tailscale":  tailscale,
        "tunnels":    _state["tunnels"],
        "tunnel_active": _state["active"],
    }

@router.post("/start")
def start_tunnel(backend_port: int = 8000, frontend_port: int = 5173,
                 auth_token: str = ""):
    global _state
    try:
        from pyngrok import ngrok, conf
        if auth_token:
            conf.get_default().auth_token = auth_token

        # Kill existing
        ngrok.kill()

        # Start tunnels
        be = ngrok.connect(backend_port,  bind_tls=True)
        fe = ngrok.connect(frontend_port, bind_tls=True)

        be_url = be.public_url
        fe_url = fe.public_url

        _state = {
            "active":  True,
            "error":   "",
            "tunnels": [
                {"label": "Frontend (Web UI)", "url": fe_url, "qr": _make_qr(fe_url), "port": frontend_port},
                {"label": "Backend (API)",     "url": be_url, "qr": _make_qr(be_url), "port": backend_port},
            ]
        }
        return {"success": True, "tunnels": _state["tunnels"],
                "message": f"Tunnels active — share {fe_url} with anyone!"}

    except ImportError:
        return {"success": False,
                "message": "pyngrok not installed. Run: pip install pyngrok"}
    except Exception as e:
        _state["error"] = str(e)
        return {"success": False, "message": str(e)}

@router.post("/stop")
def stop_tunnel():
    global _state
    try:
        from pyngrok import ngrok
        ngrok.kill()
    except:
        pass
    _state = {"tunnels": [], "active": False, "error": ""}
    return {"success": True, "message": "Tunnels stopped"}

@router.get("/status")
def tunnel_status():
    return {
        "active":  _state["active"],
        "tunnels": _state["tunnels"],
        "error":   _state["error"],
    }
