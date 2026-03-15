import React, { useState, useEffect } from 'react'
import { api } from '../api.js'

const ICON = {image:'🖼',video:'🎬',audio:'🎵',pdf:'📄',text:'📝',code:'🔧',archive:'🗜',apk:'📦',database:'🗄',file:'📄'}
const BM = [['/sdcard','📱 /sdcard'],['/sdcard/DCIM','📷 DCIM'],['/sdcard/Download','⬇ Downloads'],
            ['/sdcard/Music','🎵 Music'],['/sdcard/Movies','📹 Videos'],['/sdcard/Documents','📄 Docs'],
            ['/sdcard/Android/data','📦 Android'],['/data','⚙ /data'],['/system','🔧 /system']]

export default function Browse() {
  const [cur,  setCur]  = useState('/sdcard')
  const [path, setPath] = useState('/sdcard')
  const [items,setItems]= useState([])
  const [sel,  setSel]  = useState(null)
  const [thumb,setThumb]= useState(null)   // img src string or null
  const [hist, setHist] = useState(['/sdcard'])
  const [hi,   setHi]   = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg,  setMsg]  = useState('')

  const load = async (p) => {
    p = (p||cur).replace(/\/+$/,'')||'/'
    setBusy(true); setSel(null); setThumb(null); setMsg('')
    try {
      const d = await api.ls(p)
      setItems(d.items||[])
      setCur(p); setPath(p)
      setMsg(`${p}  —  ${d.count} item(s)`)
    } catch(e) { setMsg('Error: '+e.message) }
    setBusy(false)
  }

  const go = (p) => {
    p = p.replace(/\/+$/,'')||'/'
    setHist(h=>{ const n=[...h.slice(0,hi+1),p]; setHi(n.length-1); return n })
    load(p)
  }

  useEffect(()=>{ load('/sdcard') },[])

  const back = () => { if(hi>0){ const i=hi-1; setHi(i); load(hist[i]) } }
  const fwd  = () => { if(hi<hist.length-1){ const i=hi+1; setHi(i); load(hist[i]) } }
  const up   = () => { const p=cur.split('/').slice(0,-1).join('/')||'/'; go(p) }

  const select = (item) => {
    setSel(item)
    if (item.is_image) {
      // Direct URL — Vite proxy or same origin serves /api/files/thumb
      setThumb(api.thumbUrl(`${cur}/${item.name}`))
    } else {
      setThumb(null)
    }
  }

  const dbl = (item) => { if(item.is_dir) go(`${cur}/${item.name}`) }

  const pull = async () => {
    if (!sel) return
    try {
      const blob = await api.download(`${cur}/${sel.name}`)
      const a = document.createElement('a')
      a.href=URL.createObjectURL(blob); a.download=sel.name; a.click()
    } catch(e) { setMsg('Pull failed: '+e.message) }
  }

  const push = () => {
    const inp=document.createElement('input'); inp.type='file'
    inp.onchange=async()=>{
      const f=inp.files[0]; if(!f) return
      setMsg('Uploading…')
      try { const r=await api.upload(cur,f); setMsg(r.message); load(cur) }
      catch(e) { setMsg(e.message) }
    }
    inp.click()
  }

  const del = async () => {
    if(!sel||!confirm(`Delete ${sel.name}?`)) return
    try { await api.rm(`${cur}/${sel.name}`); setSel(null); setThumb(null); load(cur) }
    catch(e) { setMsg(e.message) }
  }

  const btnStyle = (color) => ({
    background:'#21262d',color,border:'none',cursor:'pointer',padding:'5px 10px',
    borderRadius:6,fontSize:13,fontWeight:600,fontFamily:'inherit',transition:'all 0.15s'
  })

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      {/* Toolbar */}
      <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 10px',
                   background:'#161b22',borderBottom:'1px solid #30363d',flexShrink:0,flexWrap:'wrap'}}>
        <button className="btn btn-b" style={{padding:'5px 8px'}} onClick={back} disabled={hi===0}>◀</button>
        <button className="btn btn-b" style={{padding:'5px 8px'}} onClick={fwd}  disabled={hi===hist.length-1}>▶</button>
        <button className="btn btn-b" style={{padding:'5px 8px'}} onClick={up}>⬆</button>
        <button className="btn btn-b" style={{padding:'5px 8px'}} onClick={()=>go('/sdcard')}>🏠</button>
        <button className="btn btn-o" style={{padding:'5px 8px'}} onClick={()=>load(cur)}>↻</button>
        <input className="inp" style={{flex:1,minWidth:180}} value={path}
          onChange={e=>setPath(e.target.value)} onKeyDown={e=>e.key==='Enter'&&go(path)}/>
        <button className="btn btn-b" onClick={pull} disabled={!sel}>⬇ Pull</button>
        <button className="btn btn-o" onClick={push}>⬆ Push</button>
        <button className="btn btn-r" onClick={del}  disabled={!sel}>🗑</button>
      </div>

      <div style={{display:'flex',flex:1,minHeight:0}}>
        {/* Bookmarks */}
        <div style={{width:140,flexShrink:0,background:'#161b22',borderRight:'1px solid #30363d',overflowY:'auto'}}>
          <div style={{fontSize:10,color:'#8b949e',padding:'10px 12px 4px',fontWeight:700,textTransform:'uppercase',letterSpacing:1}}>Bookmarks</div>
          {BM.map(([p,label])=>(
            <button key={p} onClick={()=>go(p)}
              style={{display:'block',width:'100%',textAlign:'left',padding:'8px 12px',fontSize:12,
                      background:'transparent',border:'none',cursor:'pointer',fontFamily:'inherit',
                      color:cur.startsWith(p)?'#00ff88':'#8b949e',transition:'color 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='#21262d'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              {label}
            </button>
          ))}
        </div>

        {/* File list */}
        <div style={{flex:1,overflowY:'auto',minWidth:0}}>
          {busy&&<div style={{color:'#8b949e',padding:'10px 14px',fontSize:13}}>⏳ Loading…</div>}
          <table className="tbl">
            <thead>
              <tr><th style={{width:32}}></th><th>Name</th><th style={{width:80}}>Size</th>
                  <th style={{width:150}}>Modified</th><th style={{width:110}}>Permissions</th></tr>
            </thead>
            <tbody>
              {items.map((item,i)=>(
                <tr key={i} onClick={()=>select(item)} onDoubleClick={()=>dbl(item)}
                    className={sel?.name===item.name?'sel':''} style={{cursor:'pointer'}}>
                  <td style={{textAlign:'center',fontSize:16}}>{item.is_dir?'📁':(ICON[item.type]||'📄')}</td>
                  <td style={{fontFamily:'monospace',fontSize:12,maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                              color:item.is_dir?'#58a6ff':'#e6edf3',fontWeight:item.is_dir?600:'normal'}}>{item.name}</td>
                  <td style={{color:'#8b949e',fontSize:12,textAlign:'right',paddingRight:16}}>{item.size}</td>
                  <td style={{color:'#8b949e',fontSize:11,whiteSpace:'nowrap'}}>{item.date}</td>
                  <td style={{color:'#8b949e',fontSize:11,fontFamily:'monospace'}}>{item.permissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length===0&&!busy&&<div style={{textAlign:'center',color:'#8b949e',padding:'50px 0',fontSize:13}}>{msg.startsWith('Error')?msg:'Empty directory'}</div>}
        </div>

        {/* Preview */}
        <div style={{width:200,flexShrink:0,background:'#161b22',borderLeft:'1px solid #30363d',display:'flex',flexDirection:'column'}}>
          <div style={{fontSize:10,color:'#8b949e',padding:'10px 12px 6px',fontWeight:700,textTransform:'uppercase',
                       letterSpacing:1,borderBottom:'1px solid #30363d'}}>Preview</div>
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:10,overflow:'hidden'}}>
            {thumb
              ? <img src={thumb} alt="preview" key={thumb}
                     style={{maxWidth:'100%',maxHeight:220,borderRadius:4,objectFit:'contain',border:'1px solid #30363d'}}
                     onError={()=>setThumb(null)}/>
              : <div style={{color:'#8b949e',fontSize:12,textAlign:'center',lineHeight:'1.8'}}>
                  {sel ? (sel.is_image ? '⏳ Loading…' : `${ICON[sel.type]||'📄'}\n\nNo preview`) : '🖼\n\nSelect an image\nto preview'}
                </div>
            }
          </div>
          {sel&&<div style={{fontSize:11,padding:'8px 12px',borderTop:'1px solid #30363d',
                              fontFamily:'monospace',color:'#8b949e',lineHeight:'1.7',flexShrink:0}}>
            <div style={{color:'#e6edf3',fontWeight:600,wordBreak:'break-all'}}>{sel.name}</div>
            <div>{sel.size}</div>
            <div>{sel.date}</div>
          </div>}
        </div>
      </div>

      {/* Status */}
      <div style={{background:'#161b22',borderTop:'1px solid #30363d',padding:'4px 12px',
                   fontSize:11,color:'#8b949e',fontFamily:'monospace',flexShrink:0}}>{msg}</div>
    </div>
  )
}
