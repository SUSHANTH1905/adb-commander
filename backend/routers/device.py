from fastapi import APIRouter
from fastapi.responses import Response
from adb_helpers import adb, adb_shell, adb_shell_raw
import re

router = APIRouter()

@router.get("/info")
def info():
    d = {}
    for k,p in [("model","ro.product.model"),("brand","ro.product.brand"),
                ("android","ro.build.version.release"),("api","ro.build.version.sdk"),
                ("cpu","ro.product.cpu.abi"),("build","ro.build.display.id")]:
        v,_,_ = adb_shell(f"getprop {p}"); d[k] = v or "—"
    s,_,_ = adb("get-serialno"); d["serial"] = s or "—"
    return d

@router.get("/battery")
def battery():
    out,_,_ = adb_shell("dumpsys battery")
    d = {}
    for line in out.splitlines():
        m = re.match(r'\s+(\w[\w ]+):\s*(.+)', line)
        if m: d[m.group(1).strip()] = m.group(2).strip()
    return d

@router.get("/storage")
def storage():
    out,_,_ = adb_shell("df -h /sdcard /data 2>/dev/null")
    rows = []
    for line in out.splitlines():
        if not line.strip() or line.startswith("Filesystem"): continue
        p = line.split()
        if len(p) >= 6:
            rows.append({"mount":p[5],"size":p[1],"used":p[2],"avail":p[3],"pct":p[4]})
    return {"storage": rows}

@router.post("/reboot")
def reboot(mode: str = "normal"):
    args = ["reboot"] + ([] if mode=="normal" else [mode])
    out,err,rc = adb(*args)
    return {"success": rc==0, "message": out or err}
