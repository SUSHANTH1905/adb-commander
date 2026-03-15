from fastapi import APIRouter
from pydantic import BaseModel
from adb_helpers import adb_shell

router = APIRouter()

class Tap(BaseModel):   x:int; y:int
class Swipe(BaseModel): x1:int; y1:int; x2:int; y2:int; ms:int=300
class Text(BaseModel):  text:str
class Key(BaseModel):   keycode:str

@router.post("/tap")
def tap(r:Tap):
    _,err,rc = adb_shell(f"input tap {r.x} {r.y}")
    return {"success":rc==0,"message":f"Tapped ({r.x},{r.y})" if rc==0 else err}

@router.post("/swipe")
def swipe(r:Swipe):
    _,err,rc = adb_shell(f"input swipe {r.x1} {r.y1} {r.x2} {r.y2} {r.ms}")
    return {"success":rc==0,"message":"Swiped" if rc==0 else err}

@router.post("/text")
def text(r:Text):
    safe = r.text.replace("'","\\'").replace(" ","%s")
    _,err,rc = adb_shell(f"input text '{safe}'")
    return {"success":rc==0,"message":"Sent" if rc==0 else err}

@router.post("/key")
def key(r:Key):
    _,err,rc = adb_shell(f"input keyevent {r.keycode}")
    return {"success":rc==0,"message":f"Key {r.keycode}" if rc==0 else err}
