"""
ADB Commander Pro v3.1 — FastAPI Backend
Dev:  uvicorn main:app --host 0.0.0.0 --reload --port 8000
Prod: uvicorn main:app --host 0.0.0.0 --port 8000
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import asyncio, os, subprocess

from routers import wireless, device, apps, files, calls, messages, \
                    notifs, screen, inp, tunnel

app = FastAPI(title="ADB Commander Pro", version="3.1",
              docs_url="/api/docs", openapi_url="/api/openapi.json")

# Allow ALL origins — required for remote/ngrok access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,         # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wireless.router, prefix="/api/wireless", tags=["Wireless"])
app.include_router(device.router,   prefix="/api/device",   tags=["Device"])
app.include_router(apps.router,     prefix="/api/apps",     tags=["Apps"])
app.include_router(files.router,    prefix="/api/files",    tags=["Files"])
app.include_router(calls.router,    prefix="/api/calls",    tags=["Calls"])
app.include_router(messages.router, prefix="/api/messages", tags=["Messages"])
app.include_router(notifs.router,   prefix="/api/notifs",   tags=["Notifs"])
app.include_router(screen.router,   prefix="/api/screen",   tags=["Screen"])
app.include_router(inp.router,      prefix="/api/input",    tags=["Input"])
app.include_router(tunnel.router,   prefix="/api/tunnel",   tags=["Tunnel"])

def _grab():
    try:
        r   = subprocess.run(["adb","shell","screencap -p"],
                              capture_output=True, timeout=10)
        raw = r.stdout
        if not raw: return b""
        if b'\r\n' in raw[:512]: raw = raw.replace(b'\r\n', b'\n')
        return raw if raw[:4] == b'\x89PNG' else b""
    except:
        return b""

@app.websocket("/ws/screen")
async def ws_screen(ws: WebSocket):
    await ws.accept()
    loop = asyncio.get_event_loop()
    try:
        while True:
            raw = await loop.run_in_executor(None, _grab)
            if raw:
                await ws.send_bytes(raw)
            await asyncio.sleep(0.5)
    except (WebSocketDisconnect, Exception):
        pass

# Production: serve built React app from frontend/dist/
DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.isdir(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST,"assets")), name="assets")
    @app.get("/", include_in_schema=False)
    @app.get("/{p:path}", include_in_schema=False)
    def spa(p: str = ""):
        idx = os.path.join(DIST, "index.html")
        return FileResponse(idx) if os.path.isfile(idx) else {"error":"not found"}
else:
    @app.get("/")
    def root():
        return {"status":"running","docs":"/api/docs",
                "note":"Run frontend with: cd frontend && npm run dev"}
