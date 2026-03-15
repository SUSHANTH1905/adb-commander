"""Shared ADB utilities — always returns str, never None"""
import subprocess, re

def _d(b):
    if b is None: return ""
    return b.decode("utf-8", errors="replace").strip() if isinstance(b, bytes) else str(b).strip()

def adb(*args, timeout=15):
    try:
        r = subprocess.run(["adb"] + list(args), capture_output=True, timeout=timeout)
        return _d(r.stdout), _d(r.stderr), r.returncode
    except FileNotFoundError: return "", "adb not found in PATH", 1
    except subprocess.TimeoutExpired: return "", "timed out", 1
    except Exception as e: return "", str(e), 1

def adb_shell(cmd, timeout=15):
    try:
        r = subprocess.run(["adb", "shell", cmd], capture_output=True, timeout=timeout)
        return _d(r.stdout), _d(r.stderr), r.returncode
    except FileNotFoundError: return "", "adb not found in PATH", 1
    except subprocess.TimeoutExpired: return "", "timed out", 1
    except Exception as e: return "", str(e), 1

def adb_shell_raw(cmd, timeout=15):
    try:
        r = subprocess.run(["adb", "shell", cmd], capture_output=True, timeout=timeout)
        return r.stdout, _d(r.stderr), r.returncode
    except Exception as e: return b"", str(e), 1

def safe(v):
    if v is None: return ""
    s = str(v).strip()
    return "" if s.upper() in ("NULL","NONE","N/A","") else s

def parse_content(text):
    """Parse `adb shell content query` output into list of dicts."""
    rows, cur = [], None
    for raw in text.splitlines():
        if re.match(r'\s*Row:\s*\d+', raw, re.I):
            if cur is not None: rows.append(cur)
            cur = {}
            rest = re.sub(r'^\s*Row:\s*\d+\s*', '', raw)
            if rest.strip(): cur.update(_fields(rest))
        elif cur is not None:
            line = raw.strip()
            if not line: continue
            m = re.match(r'^(\w+):\s*(.*)', line)
            if m: cur[m.group(1)] = safe(m.group(2))
            else: cur.update(_fields(line))
    if cur is not None: rows.append(cur)
    return rows

def _fields(text):
    d = {}
    for part in re.split(r',\s*(?=\w+=)', text.strip()):
        part = part.strip()
        eq = part.find('=')
        if eq > 0:
            k, v = part[:eq].strip(), part[eq+1:].strip()
            if re.match(r'^\w+$', k): d[k] = safe(v)
    return d
