from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse
from adb_helpers import adb, adb_shell, adb_shell_raw
import io, os, tempfile

router = APIRouter()

IMG = {"jpg","jpeg","png","gif","webp","bmp","heic","heif"}
VID = {"mp4","mkv","avi","mov","3gp"}
AUD = {"mp3","wav","flac","ogg","m4a"}

def _type(ext):
    if ext in IMG: return "image"
    if ext in VID: return "video"
    if ext in AUD: return "audio"
    return {"pdf":"pdf","txt":"text","log":"text","xml":"code","json":"code",
            "zip":"archive","apk":"apk","db":"database"}.get(ext,"file")

def _sz(s):
    try:
        n = int(s)
        for u in ("B","KB","MB","GB"):
            if n < 1024: return f"{n:.0f} {u}"
            n /= 1024
    except: pass
    return s or ""

@router.get("/list")
def list_files(path: str = "/sdcard"):
    out, err, rc = adb_shell(f"ls -la '{path}' 2>&1", timeout=20)
    if rc != 0:
        return JSONResponse({"error": out or err}, status_code=400)
    items = []
    for line in out.splitlines():
        line = line.strip()
        if not line or line.startswith("total"): continue
        p = line.split(None, 8)
        if len(p) < 5: continue
        perms = p[0]
        is_dir = perms.startswith("d")
        size = p[4] if not is_dir else ""
        date = f"{p[5]} {p[6]}" if len(p) > 6 else ""
        name = (p[8] if len(p) > 8 else p[-1]).split(" -> ")[0].strip()
        if not name or name in (".",".."): continue
        ext = name.rsplit(".",1)[-1].lower() if "." in name else ""
        items.append({"name":name,"size":_sz(size),"size_raw":size,
                      "date":date,"permissions":perms,
                      "is_dir":is_dir,"is_image":ext in IMG,"type":_type(ext)})
    return {"path": path, "items": items, "count": len(items)}

@router.get("/download")
def download(path: str):
    raw, err, rc = adb_shell_raw(f"cat '{path}'")
    if rc != 0: return JSONResponse({"error": err}, status_code=400)
    name = path.split("/")[-1]
    ext  = name.rsplit(".",1)[-1].lower() if "." in name else ""
    mt   = "image/jpeg" if ext in ("jpg","jpeg") else \
           "image/png" if ext=="png" else \
           "video/mp4" if ext=="mp4" else "application/octet-stream"
    return StreamingResponse(io.BytesIO(raw), media_type=mt,
        headers={"Content-Disposition": f'attachment; filename="{name}"'})

@router.get("/thumb")
def thumb(path: str, size: int = 240):
    raw, err, rc = adb_shell_raw(f"cat '{path}'")
    if rc != 0 or not raw:
        return JSONResponse({"error": err or "empty"}, status_code=400)
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        img.thumbnail((size, size * 2))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=80)
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/jpeg",
            headers={"Cache-Control":"no-store"})
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/upload")
async def upload(dest_path: str, file: UploadFile = File(...)):
    tmp = tempfile.mktemp(suffix="_" + file.filename)
    try:
        with open(tmp,"wb") as f: f.write(await file.read())
        _, err, rc = adb("push", tmp, f"{dest_path.rstrip('/')}/{file.filename}", timeout=120)
        return {"success": rc==0, "message": err if rc!=0 else "Uploaded"}
    finally:
        try: os.remove(tmp)
        except: pass

@router.delete("/")
def delete(path: str):
    _, err, rc = adb_shell(f"rm -rf '{path}'")
    return {"success": rc==0, "message": err if rc!=0 else "Deleted"}
