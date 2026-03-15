import React, { useState } from 'react'
import { api } from '../api.js'

// ── Device ───────────────────────────────────────────────────
export function Device() {
  const [info, setInfo]   = useState(null)
  const [bat,  setBat]    = useState(null)
  const [stor, setStor]   = useState(null)
  const [busy, setBusy]   = useState('')
  const [msg,  setMsg]    = useState(null)

  const load = async (what) => {
    setBusy(what); setMsg(null)
    try {
      if (what==='info')    setInfo(await api.info())
      if (what==='battery') setBat(await api.battery())
      if (what==='storage') setStor(await api.storage())
    } catch(e) { setMsg({t:e.message,ok:false}) }
    setBusy('')
  }

  const reboot = async (mode) => {
    if (!confirm(`Reboot${mode!=='normal'?' into '+mode:''}?`)) return
    const r = await api.reboot(mode)
    setMsg({t:r.message,ok:r.success})
  }

  const Row = ({label,val}) => (
    <div style={{display:'flex',alignItems:'center',padding:'7px 0',borderBottom:'1px solid #30363d'}}>
      <span style={{width:110,color:'#8b949e',fontSize:13,flexShrink:0}}>{label}</span>
      <span style={{fontFamily:'monospace',color:'#fff',fontSize:13}}>{val||'—'}</span>
    </div>
  )

  return (
    <div style={{padding:20,maxWidth:680,overflowY:'auto',height:'100%'}}>
      <h2 style={{color:'#00ff88',fontWeight:700,fontSize:18,marginBottom:16}}>📱 Device</h2>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
        <button className="btn btn-g" onClick={()=>load('info')}    disabled={!!busy}>🔍 Device Info</button>
        <button className="btn btn-b" onClick={()=>load('battery')} disabled={!!busy}>🔋 Battery</button>
        <button className="btn btn-b" onClick={()=>load('storage')} disabled={!!busy}>💾 Storage</button>
        <button className="btn btn-o" onClick={()=>reboot('normal')}>🔄 Reboot</button>
        <button className="btn btn-r" onClick={()=>reboot('recovery')}>⚙ Recovery</button>
        <button className="btn btn-r" onClick={()=>reboot('bootloader')}>🔓 Bootloader</button>
      </div>
      {busy && <div style={{color:'#8b949e',fontSize:13,marginBottom:12}}>Loading {busy}…</div>}
      {msg  && <div className={msg.ok?'msg-ok':'msg-err'} style={{marginBottom:12}}>{msg.t}</div>}

      {info && <div className="card" style={{marginBottom:12}}>
        <div style={{color:'#58a6ff',fontWeight:600,marginBottom:10}}>Device Information</div>
        <Row label="Brand"   val={info.brand}/>
        <Row label="Model"   val={info.model}/>
        <Row label="Android" val={`${info.android} (API ${info.api})`}/>
        <Row label="CPU"     val={info.cpu}/>
        <Row label="Build"   val={info.build}/>
        <Row label="Serial"  val={info.serial}/>
      </div>}

      {bat && <div className="card" style={{marginBottom:12}}>
        <div style={{color:'#58a6ff',fontWeight:600,marginBottom:10}}>🔋 Battery</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 16px'}}>
          {Object.entries(bat).map(([k,v])=>(
            <div key={k} style={{display:'flex',gap:8,padding:'5px 0',borderBottom:'1px solid #30363d',fontSize:13}}>
              <span style={{color:'#8b949e',width:120,flexShrink:0}}>{k}</span>
              <span style={{fontFamily:'monospace',color:'#fff'}}>{v}</span>
            </div>
          ))}
        </div>
      </div>}

      {stor && <div className="card">
        <div style={{color:'#58a6ff',fontWeight:600,marginBottom:10}}>💾 Storage</div>
        <table className="tbl">
          <thead><tr><th>Mount</th><th>Size</th><th>Used</th><th>Free</th><th>Use%</th></tr></thead>
          <tbody>{stor.storage.map((s,i)=>(
            <tr key={i}>
              <td style={{fontFamily:'monospace'}}>{s.mount}</td>
              <td>{s.size}</td><td>{s.used}</td>
              <td style={{color:'#00ff88'}}>{s.avail}</td>
              <td>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <div style={{width:60,background:'#21262d',borderRadius:4,height:5}}>
                    <div style={{width:s.pct,background:'#00ff88',borderRadius:4,height:5}}/>
                  </div>
                  <span style={{fontSize:11}}>{s.pct}</span>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </div>
  )
}

// ── Apps ─────────────────────────────────────────────────────
export function Apps() {
  const [apps, setApps]     = useState([])
  const [filter, setFilter] = useState('all')
  const [q, setQ]           = useState('')
  const [sel, setSel]       = useState(null)
  const [busy, setBusy]     = useState(false)
  const [msg, setMsg]       = useState(null)

  const load = async () => {
    setBusy(true); setMsg(null); setSel(null)
    try {
      const d = await api.apps(filter, q)
      setApps(d.apps||[])
      setMsg({t:`✓ ${d.total} packages`, ok:true})
    } catch(e) { setMsg({t:e.message,ok:false}) }
    setBusy(false)
  }

  const act = async (fn, label) => {
    if (!sel) return
    setMsg({t:`Running ${label}…`,ok:true})
    try { const r=await fn(sel.package); setMsg({t:r.message||r.output||'Done',ok:r.success!==false}) }
    catch(e) { setMsg({t:e.message,ok:false}) }
  }

  const pullApk = async () => {
    if (!sel) return
    const blob = await api.pullApk(sel.package)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = sel.package+'.apk'; a.click()
  }

  const visible = q ? apps.filter(a=>a.package.toLowerCase().includes(q.toLowerCase())) : apps

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',gap:8,padding:'10px 14px',borderBottom:'1px solid #30363d',
                   background:'#161b22',flexWrap:'wrap',alignItems:'center',flexShrink:0}}>
        <input className="inp" style={{width:220}} placeholder="Filter packages…"
          value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()}/>
        <select className="inp" value={filter} onChange={e=>setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="3rdparty">3rd Party</option>
          <option value="system">System</option>
        </select>
        <button className="btn btn-g" onClick={load} disabled={busy}>{busy?<span className="spin">↻</span>:'🔄'} Load</button>
        <button className="btn btn-b" onClick={pullApk}              disabled={!sel}>⬇ Pull APK</button>
        <button className="btn btn-o" onClick={()=>act(api.dumpsys,'dumpsys')} disabled={!sel}>⚙ Dumpsys</button>
        <button className="btn btn-r" onClick={()=>act(api.stopApp,'stop')}    disabled={!sel}>⏹ Stop</button>
        <button className="btn btn-g" onClick={()=>act(api.launchApp,'launch')}disabled={!sel}>🚀 Launch</button>
      </div>
      {msg && <div className={msg.ok?'msg-ok':'msg-err'} style={{margin:'6px 14px',flexShrink:0}}>{msg.t}</div>}
      <div style={{flex:1,overflowY:'auto'}}>
        <table className="tbl">
          <thead><tr><th style={{width:24}}></th><th>Package</th><th>APK Path</th></tr></thead>
          <tbody>
            {visible.map((a,i)=>(
              <tr key={i} onClick={()=>setSel(a)} className={sel?.package===a.package?'sel':''} style={{cursor:'pointer'}}>
                <td style={{color:'#00ff88',textAlign:'center'}}>{sel?.package===a.package?'▶':''}</td>
                <td style={{fontFamily:'monospace',fontSize:12}}>{a.package}</td>
                <td style={{fontFamily:'monospace',fontSize:11,color:'#8b949e'}}>{a.apk}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {apps.length===0&&!busy&&<div style={{textAlign:'center',color:'#8b949e',padding:'60px 0',fontSize:13}}>Click Load to list installed packages</div>}
      </div>
      {sel&&<div style={{background:'#161b22',borderTop:'1px solid #30363d',padding:'6px 14px',fontSize:12,fontFamily:'monospace',color:'#8b949e',flexShrink:0}}>
        Selected: <span style={{color:'#00ff88'}}>{sel.package}</span>
      </div>}
    </div>
  )
}
