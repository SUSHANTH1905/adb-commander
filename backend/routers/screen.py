from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse, Response
from pydantic import BaseModel
from adb_helpers import adb, adb_shell, adb_shell_raw
import io, threading

router = APIRouter()

@router.get("/shot")
def screenshot():
    raw,_,rc = adb_shell_raw("screencap -p")
    if rc != 0 or not raw: return JSONResponse({"error":"screencap failed"}, status_code=503)
    if b'\r\n' in raw[:512]: raw = raw.replace(b'\r\n', b'\n')
    if raw[:4] != b'\x89PNG': return JSONResponse({"error":"invalid PNG"}, status_code=503)
    return Response(content=raw, media_type="image/png",
        headers={"Cache-Control":"no-store"})

@router.post("/record/start")
def rec_start():
    def go(): adb_shell("screenrecord --bit-rate 8000000 /sdcard/rec.mp4", timeout=185)
    threading.Thread(target=go, daemon=True).start()
    return {"status":"recording"}

@router.post("/record/stop")
def rec_stop():
    adb_shell("kill $(pidof screenrecord) 2>/dev/null")
    import time; time.sleep(1)
    raw,_,rc = adb_shell_raw("cat /sdcard/rec.mp4")
    if rc != 0 or not raw: return JSONResponse({"error":"no recording"}, status_code=404)
    adb_shell("rm /sdcard/rec.mp4")
    return StreamingResponse(io.BytesIO(raw), media_type="video/mp4",
        headers={"Content-Disposition":'attachment; filename="recording.mp4"'})
