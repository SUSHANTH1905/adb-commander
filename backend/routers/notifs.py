from fastapi import APIRouter
from fastapi.responses import JSONResponse
from adb_helpers import adb_shell, safe
from datetime import datetime
import re

router = APIRouter()
NO_CACHE = {"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"}

@router.get("/")
def get_notifs():
    out, err, rc = adb_shell("dumpsys notification --noredact 2>/dev/null", timeout=20)
    if rc != 0:
        return JSONResponse({"notifications": [], "error": err, "total": 0}, headers=NO_CACHE)
    notifs, cur = [], None
    for line in out.splitlines():
        line = line.strip()
        if "NotificationRecord(" in line:
            if cur and cur.get("app"): notifs.append(cur)
            cur = {"app": "", "title": "", "text": "", "time": "", "priority": "0"}
            m = re.search(r'pkg=(\S+)', line)
            if m: cur["app"] = m.group(1)
            continue
        if cur is None: continue
        if "pkg=" in line and not cur["app"]:
            m = re.search(r'pkg=(\S+)', line)
            if m: cur["app"] = m.group(1)
        if "android.title" in line:
            m = re.search(r'android\.title[^=]*=(.+)', line)
            if m: cur["title"] = safe(m.group(1))[:80]
        if "android.text=" in line and "Lines" not in line:
            m = re.search(r'android\.text[^=]*=(.+)', line)
            if m: cur["text"] = safe(m.group(1))[:120]
        if "when=" in line and not cur["time"]:
            m = re.search(r'when=(\d+)', line)
            if m:
                try:
                    cur["time"] = datetime.fromtimestamp(int(m.group(1)) / 1000).strftime("%H:%M:%S")
                except:
                    pass
        if "priority=" in line and cur["priority"] == "0":
            m = re.search(r'priority=(-?\d+)', line)
            if m: cur["priority"] = m.group(1)
    if cur and cur.get("app"): notifs.append(cur)
    return JSONResponse({"notifications": notifs, "total": len(notifs)}, headers=NO_CACHE)

@router.delete("/")
def dismiss():
    adb_shell("service call notification 1")
    return JSONResponse({"success": True}, headers=NO_CACHE)
