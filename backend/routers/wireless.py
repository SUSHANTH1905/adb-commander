from fastapi import APIRouter
from pydantic import BaseModel
from adb_helpers import adb, adb_shell
import re, subprocess

router = APIRouter()

class ConnReq(BaseModel):
    host: str
    port: int = 5555

class PairReq(BaseModel):
    host: str; port: int; code: str

@router.get("/devices")
def devices():
    out, _, _ = adb("devices", "-l")
    result = []
    for line in out.splitlines()[1:]:
        line = line.strip()
        if not line: continue
        parts = line.split()
        if len(parts) < 2: continue
        addr, state = parts[0], parts[1]
        kind = "wifi" if re.match(r'\d+\.\d+\.\d+\.\d+:\d+', addr) else "usb"
        result.append({"address": addr, "state": state, "type": kind})
    return {"devices": result}

@router.post("/connect")
def connect(r: ConnReq):
    out, err, rc = adb("connect", f"{r.host}:{r.port}", timeout=10)
    ok = rc == 0 and ("connected" in out.lower() or "already" in out.lower())
    return {"success": ok, "message": out or err}

@router.post("/disconnect")
def disconnect(r: ConnReq):
    out, err, rc = adb("disconnect", f"{r.host}:{r.port}")
    return {"success": rc == 0, "message": out or err}

@router.post("/tcpip")
def tcpip():
    out, err, rc = adb("tcpip", "5555")
    ip, _, _ = adb_shell("ip -f inet addr show wlan0 2>/dev/null | grep -o 'inet [0-9.]*' | cut -d' ' -f2")
    return {"success": rc == 0, "message": out or err, "ip": ip}

@router.post("/pair")
def pair(r: PairReq):
    try:
        p = subprocess.run(["adb","pair",f"{r.host}:{r.port}"],
            input=f"{r.code}\n", capture_output=True, text=True, timeout=15)
        ok = p.returncode == 0 and "paired" in p.stdout.lower()
        return {"success": ok, "message": p.stdout or p.stderr}
    except Exception as e:
        return {"success": False, "message": str(e)}
