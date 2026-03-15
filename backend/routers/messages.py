from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from adb_helpers import adb_shell, parse_content, safe
from datetime import datetime
import io, csv

router = APIRouter()
NO_CACHE = {"Cache-Control": "no-store, no-cache, must-revalidate", "Pragma": "no-cache"}

@router.get("/")
def get_messages(box: str = "all"):
    uri = {"inbox": "content://sms/inbox", "sent": "content://sms/sent"}.get(box, "content://sms")
    out, err, rc = adb_shell(
        f"content query --uri {uri} --projection address:body:date:type:read",
        timeout=30)
    if rc != 0 or not out.strip():
        return JSONResponse({"messages": [], "threads": [], "error": err, "total": 0}, headers=NO_CACHE)
    msgs = []
    for d in parse_content(out):
        try:
            addr  = safe(d.get("address")) or "Unknown"
            body  = safe(d.get("body"))
            ts    = safe(d.get("date")) or "0"
            mtype = safe(d.get("type")) or "1"
            ts_ms = int(ts) if ts.isdigit() else 0
            try:
                dt = datetime.fromtimestamp(ts_ms // 1000).strftime("%Y-%m-%d %H:%M")
            except:
                dt = ts
            msgs.append({"address": addr, "body": body, "date": dt,
                         "direction": "out" if mtype == "2" else "in", "ts": ts_ms})
        except:
            pass
    # Sort newest first
    msgs.sort(key=lambda m: m.get("ts", 0), reverse=True)

    # Build thread list (most recent message per contact)
    threads = {}
    for m in msgs:
        a = m["address"]
        if a not in threads:
            threads[a] = {"address": a, "count": 0, "last": "", "ts": 0}
        threads[a]["count"] += 1
        if m["ts"] > threads[a]["ts"]:
            threads[a]["last"] = (m["body"] or "")[:60]
            threads[a]["ts"] = m["ts"]

    thread_list = sorted(threads.values(), key=lambda t: t["ts"], reverse=True)
    for t in thread_list: t.pop("ts", None)

    # Remove ts from messages too
    for m in msgs: m.pop("ts", None)

    return JSONResponse(
        {"messages": msgs, "threads": thread_list, "total": len(msgs)},
        headers=NO_CACHE)

class SMSReq(BaseModel):
    number: str
    message: str

@router.post("/send")
def send_sms(r: SMSReq):
    safe_msg = r.message.replace("'", "\\'")
    out, err, rc = adb_shell(
        f"am start -a android.intent.action.SENDTO -d sms:{r.number} "
        f"--es sms_body '{safe_msg}' --ez exit_on_sent true")
    return {"success": rc == 0, "message": out or err}

@router.get("/export")
def export_messages(box: str = "all"):
    import json
    data = json.loads(get_messages(box).body)
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=["address", "body", "date", "direction"])
    w.writeheader()
    w.writerows(data.get("messages", []))
    buf.seek(0)
    return StreamingResponse(
        io.BytesIO(buf.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="sms_{datetime.now():%Y%m%d_%H%M%S}.csv"'})
