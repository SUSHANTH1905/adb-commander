from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from adb_helpers import adb_shell, parse_content, safe
from datetime import datetime
import io, csv

router = APIRouter()
TMAP = {"1":"Incoming","2":"Outgoing","3":"Missed","4":"Voicemail","5":"Rejected","6":"Blocked"}

NO_CACHE = {"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"}

@router.get("/")
def get_calls():
    out, err, rc = adb_shell(
        "content query --uri content://call_log/calls "
        "--projection number:name:duration:type:date:subscription_id",
        timeout=30)
    if rc != 0 or not out.strip():
        return JSONResponse({"calls": [], "error": err or "no data", "total": 0}, headers=NO_CACHE)
    rows = []
    for d in parse_content(out):
        try:
            ctype = TMAP.get(safe(d.get("type")), "Unknown")
            num   = safe(d.get("number")) or "Unknown"
            name  = safe(d.get("name"))
            dur   = safe(d.get("duration")) or "0"
            ts    = safe(d.get("date")) or "0"
            sim   = safe(d.get("subscription_id"))
            ts_ms = int(ts) if ts.isdigit() else 0
            try:
                dt = datetime.fromtimestamp(ts_ms // 1000).strftime("%Y-%m-%d %H:%M")
            except:
                dt = ts
            try:
                s = int(dur); dur = f"{s//60}m {s%60}s"
            except:
                pass
            rows.append({"type": ctype, "number": num, "name": name,
                         "duration": dur, "date": dt, "sim": sim, "ts": ts_ms})
        except:
            pass
    # Sort newest first
    rows.sort(key=lambda r: r.get("ts", 0), reverse=True)
    for r in rows: r.pop("ts", None)   # remove raw ts from response
    return JSONResponse({"calls": rows, "total": len(rows)}, headers=NO_CACHE)

@router.get("/export")
def export_calls():
    data = get_calls().body
    import json
    parsed = json.loads(data)
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=["type","number","name","duration","date","sim"])
    w.writeheader()
    w.writerows(parsed.get("calls", []))
    buf.seek(0)
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="calls_{datetime.now():%Y%m%d_%H%M%S}.csv"'})

@router.delete("/")
def clear_calls():
    _, err, rc = adb_shell("content delete --uri content://call_log/calls")
    return JSONResponse({"success": rc==0, "message": err if rc!=0 else "Cleared"}, headers=NO_CACHE)
