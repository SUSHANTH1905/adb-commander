import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api.js'

// ── Screen Share ──────────────────────────────────────────────
export function ScreenShare() {
  const [on,  setOn]   = useState(false)
  const [fps, setFps]  = useState(2)
  const [status, setSt]= useState('idle')   // idle|connecting|live|error
  const [errMsg,setErr]= useState('')
  const [rfps, setRfps]= useState(null)
  const imgRef  = useRef(null)
  const wsRef   = useRef(null)
  const blobRef = useRef(null)
  const fpsC    = useRef({n:0,t:Date.now()})

  const start = () => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current=null }
    setSt('connecting'); setErr(''); setRfps(null)
    fpsC.current = {n:0, t:Date.now()}

    const proto = location.protocol==='https:'?'wss:':'ws:'
    const ws = new WebSocket(`${proto}//${location.host}/ws/screen`)
    ws.binaryType = 'blob'

    ws.onopen  = () => { setSt('live'); setOn(true) }
    ws.onerror = () => { setSt('error'); setErr('WebSocket failed — is backend running on :8000?'); setOn(false) }
    ws.onclose = (e) => {
      setOn(false)
      if (e.code===1006) { setSt('error'); setErr('Connection dropped — make sure a device is connected via ADB.') }
      else setSt('idle')
    }
    ws.onmessage = (e) => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current)
      const url = URL.createObjectURL(e.data)
      blobRef.current = url
      if (imgRef.current) imgRef.current.src = url
      fpsC.current.n++
      const now = Date.now()
      if (now - fpsC.current.t >= 2000) {
        setRfps((fpsC.current.n / ((now-fpsC.current.t)/1000)).toFixed(1))
        fpsC.current = {n:0, t:now}
      }
    }
    wsRef.current = ws
  }

  const stop = () => {
    wsRef.current?.close(); wsRef.current=null
    setOn(false); setSt('idle'); setRfps(null)
    if (blobRef.current) { URL.revokeObjectURL(blobRef.current); blobRef.current=null }
    if (imgRef.current) imgRef.current.src = ''
  }

  const snap = () => {
    if (!blobRef.current) return
    const a=document.createElement('a'); a.href=blobRef.current
    a.download=`snap_${Date.now()}.png`; a.click()
  }

  useEffect(()=>()=>{ wsRef.current?.close() },[])

  const FPS=[1,2,3,5,8,10]

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',
                   background:'#161b22',borderBottom:'1px solid #30363d',flexShrink:0,flexWrap:'wrap'}}>
        {!on
          ? <button className="btn btn-g" onClick={start}>▶ Start Live Preview</button>
          : <button className="btn btn-r" onClick={stop}>⏹ Stop</button>
        }
        <button className="btn btn-b" onClick={snap} disabled={!on}>📷 Snapshot</button>
        <div style={{display:'flex',alignItems:'center',gap:6,marginLeft:8}}>
          <span style={{color:'#8b949e',fontSize:13}}>FPS:</span>
          {FPS.map(f=>(
            <button key={f} onClick={()=>setFps(f)}
              style={{width:32,height:28,borderRadius:5,border:'none',cursor:'pointer',fontSize:12,fontWeight:600,
                      background:fps===f?'#00ff88':'#21262d',color:fps===f?'#0d1117':'#8b949e',transition:'all 0.15s'}}>
              {f}
            </button>
          ))}
        </div>
        <span style={{marginLeft:'auto',fontSize:13,fontFamily:'monospace',
                      color:status==='live'?'#00ff88':status==='error'?'#ff6b6b':status==='connecting'?'#ffa657':'#8b949e'}}>
          {status==='live'?`● Live${rfps?` — ${rfps} fps`:''}`:
           status==='connecting'?'⏳ Connecting…':
           status==='error'?'✗ Error':'● Ready'}
        </span>
      </div>

      {status==='error'&&(
        <div style={{background:'rgba(255,107,107,0.08)',borderBottom:'1px solid rgba(255,107,107,0.2)',
                     padding:'10px 16px',color:'#ff6b6b',fontSize:13,flexShrink:0}}>
          <strong>Connection error:</strong> {errMsg}
          <div style={{fontSize:11,color:'#8b949e',marginTop:4}}>
            1) Backend must be running: <code>uvicorn main:app --port 8000</code>&nbsp;&nbsp;
            2) Device connected via ADB&nbsp;&nbsp;
            3) USB debugging enabled on device
          </div>
        </div>
      )}

      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',background:'#000',overflow:'hidden',position:'relative'}}>
        <img ref={imgRef} alt="screen" style={{maxHeight:'100%',maxWidth:'100%',objectFit:'contain',display:on?'block':'none'}}/>
        {!on&&(
          <div style={{textAlign:'center',color:'#8b949e',userSelect:'none'}}>
            {status==='connecting'
              ? <div style={{color:'#ffa657',fontSize:16}}>⏳ Connecting to device…</div>
              : <><div style={{fontSize:80,marginBottom:16}}>📺</div>
                  <div style={{fontSize:18,color:'#e6edf3',marginBottom:8}}>Live Screen Share</div>
                  <div style={{fontSize:13}}>Press ▶ Start — streams via WebSocket</div></>
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────
export function Input() {
  const [tap,  setTap]  = useState({x:'540',y:'960'})
  const [swp,  setSwp]  = useState({x1:'300',y1:'1200',x2:'300',y2:'400',ms:'300'})
  const [txt,  setTxt]  = useState('')
  const [msg,  setMsg]  = useState(null)

  const go=async(fn,...args)=>{
    try{const r=await fn(...args); setMsg({t:r.message,ok:r.success})}
    catch(e){setMsg({t:e.message,ok:false})}
  }

  const KEYS=[['🏠 Home','KEYCODE_HOME'],['◀ Back','KEYCODE_BACK'],['☰ Menu','KEYCODE_MENU'],
              ['⏻ Power','KEYCODE_POWER'],['🔊 Vol+','KEYCODE_VOLUME_UP'],['🔉 Vol−','KEYCODE_VOLUME_DOWN'],
              ['↵ Enter','KEYCODE_ENTER'],['⌫ Delete','KEYCODE_DEL'],['▣ Recent','KEYCODE_APP_SWITCH']]

  const F={label:{fontSize:13,color:'#8b949e',width:28,flexShrink:0}}

  return(
    <div style={{padding:20,maxWidth:520,overflowY:'auto',height:'100%'}}>
      <h2 style={{color:'#00ff88',fontWeight:700,fontSize:18,marginBottom:16}}>🎮 Input Control</h2>
      {msg&&<div className={msg.ok?'msg-ok':'msg-err'} style={{marginBottom:14}}>{msg.t}</div>}

      <div className="card" style={{marginBottom:14}}>
        <div style={{color:'#58a6ff',fontWeight:600,marginBottom:10}}>👆 Tap</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={F.label}>X:</span>
          <input className="inp" style={{width:80}} value={tap.x} onChange={e=>setTap(t=>({...t,x:e.target.value}))}/>
          <span style={F.label}>Y:</span>
          <input className="inp" style={{width:80}} value={tap.y} onChange={e=>setTap(t=>({...t,y:e.target.value}))}/>
          <button className="btn btn-g" onClick={()=>go(api.tap,+tap.x,+tap.y)}>Tap</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div style={{color:'#58a6ff',fontWeight:600,marginBottom:10}}>👆 Swipe</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          {[['X1','x1'],['Y1','y1'],['X2','x2'],['Y2','y2'],['ms','ms']].map(([l,k])=>(
            <div key={k} style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{...F.label,width:'auto'}}>{l}:</span>
              <input className="inp" style={{width:65}} value={swp[k]} onChange={e=>setSwp(s=>({...s,[k]:e.target.value}))}/>
            </div>
          ))}
          <button className="btn btn-g" onClick={()=>go(api.swipe,+swp.x1,+swp.y1,+swp.x2,+swp.y2,+swp.ms)}>Swipe</button>
        </div>
      </div>

      <div className="card" style={{marginBottom:14}}>
        <div style={{color:'#58a6ff',fontWeight:600,marginBottom:10}}>⌨ Type Text</div>
        <div style={{display:'flex',gap:8}}>
          <input className="inp" style={{flex:1}} placeholder="Text to send to device…"
            value={txt} onChange={e=>setTxt(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&go(api.typeText,txt)}/>
          <button className="btn btn-g" onClick={()=>go(api.typeText,txt)}>Send</button>
        </div>
      </div>

      <div className="card">
        <div style={{color:'#58a6ff',fontWeight:600,marginBottom:10}}>🔘 Hardware Keys</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
          {KEYS.map(([l,k])=>(
            <button key={k} className="btn btn-b" style={{padding:'10px 8px',fontSize:13}} onClick={()=>go(api.sendKey,k)}>{l}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Screenshot ────────────────────────────────────────────────
export function Screenshot() {
  const [imgUrl,setImg]=useState(null)
  const [rec,setRec]=useState(false)
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState(null)

  const shot=async()=>{
    setBusy(true);setMsg(null)
    try{
      const blob=await api.screenshot()
      if(imgUrl?.startsWith('blob:')) URL.revokeObjectURL(imgUrl)
      setImg(URL.createObjectURL(blob))
      setMsg({t:'✓ Screenshot captured',ok:true})
    }catch(e){setMsg({t:e.message,ok:false})}
    setBusy(false)
  }

  const save=()=>{
    if(!imgUrl) return
    const a=document.createElement('a'); a.href=imgUrl; a.download=`screen_${Date.now()}.png`; a.click()
  }

  const startRec=async()=>{
    await api.recStart(); setRec(true)
    setMsg({t:'🎥 Recording started (max 3 min)…',ok:true})
  }

  const stopRec=async()=>{
    setMsg({t:'Stopping…',ok:true})
    try{
      const blob=await api.recStop(); setRec(false)
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob)
      a.download=`rec_${Date.now()}.mp4`; a.click()
      setMsg({t:'✓ Recording saved',ok:true})
    }catch(e){setMsg({t:e.message,ok:false});setRec(false)}
  }

  return(
    <div style={{padding:20,overflowY:'auto',height:'100%'}}>
      <h2 style={{color:'#00ff88',fontWeight:700,fontSize:18,marginBottom:16}}>📸 Screenshot & Recording</h2>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        <button className="btn btn-g" onClick={shot} disabled={busy}>{busy?<span className="spin">↻</span>:'📸'} Screenshot</button>
        <button className="btn btn-b" onClick={save} disabled={!imgUrl}>⬇ Save PNG</button>
        {!rec
          ?<button className="btn btn-r" onClick={startRec}>🎥 Start Recording</button>
          :<button className="btn btn-o" onClick={stopRec}>⏹ Stop & Save</button>
        }
      </div>
      {msg&&<div className={msg.ok?'msg-ok':'msg-err'} style={{marginBottom:14}}>{msg.t}</div>}
      <div style={{background:'#161b22',border:'1px solid #30363d',borderRadius:8,
                   minHeight:400,display:'flex',alignItems:'center',justifyContent:'center'}}>
        {imgUrl
          ?<img src={imgUrl} alt="screenshot" style={{maxWidth:'100%',maxHeight:'70vh',borderRadius:6,objectFit:'contain'}}/>
          :<div style={{textAlign:'center',color:'#8b949e',userSelect:'none'}}>
            <div style={{fontSize:64,marginBottom:12}}>📸</div>
            <div style={{fontSize:14}}>Click Screenshot to capture device screen</div>
          </div>
        }
      </div>
    </div>
  )
}
