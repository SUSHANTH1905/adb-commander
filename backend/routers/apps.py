from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from adb_helpers import adb, adb_shell, adb_shell_raw
import re, io

router = APIRouter()

@router.get("/")
def list_apps(filter: str = "all", q: str = ""):
    flag = {"3rdparty":"-3","system":"-s"}.get(filter,"")
    out, err, rc = adb_shell(f"pm list packages -f {flag}".strip(), timeout=30)
    if rc != 0: return {"apps":[], "error": err, "total":0}
    apps = []
    for line in out.splitlines():
        line = line.strip()
        if not line.startswith("package:"): continue
        rest = line[8:]
        if "=" in rest:
            i = rest.rfind("=")
            pkg, apk = rest[i+1:].strip(), rest[:i].strip()
        else:
            pkg, apk = rest.strip(), ""
        if pkg and (not q or q.lower() in pkg.lower()):
            apps.append({"package": pkg, "apk": apk})
    return {"apps": apps, "total": len(apps)}

@router.post("/{pkg}/stop")
def stop(pkg: str):
    _,err,rc = adb_shell(f"am force-stop {pkg}")
    return {"success": rc==0, "message": f"Stopped {pkg}" if rc==0 else err}

@router.post("/{pkg}/launch")
def launch(pkg: str):
    out,err,rc = adb_shell(f"monkey -p {pkg} -c android.intent.category.LAUNCHER 1")
    return {"success": rc==0, "message": out or err}

@router.get("/{pkg}/dumpsys")
def dumpsys(pkg: str):
    out,_,_ = adb_shell(f"dumpsys package {pkg}", timeout=20)
    return {"output": out[:8000]}

@router.get("/{pkg}/apk")
def pull_apk(pkg: str):
    out,_,_ = adb_shell(f"pm path {pkg}")
    m = re.search(r'package:(.+)', out)
    if not m: return JSONResponse({"error":"Cannot resolve APK path"}, status_code=404)
    raw,err,rc = adb_shell_raw(f"cat '{m.group(1).strip()}'")
    if rc != 0: return JSONResponse({"error": err}, status_code=500)
    return StreamingResponse(io.BytesIO(raw),
        media_type="application/vnd.android.package-archive",
        headers={"Content-Disposition": f'attachment; filename="{pkg}.apk"'})
