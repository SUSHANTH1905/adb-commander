import React, { useState, useEffect, useCallback } from 'react'
import { api } from './api.js'
import Wireless   from './pages/Wireless.jsx'
import Device     from './pages/Device.jsx'
import Apps       from './pages/Apps.jsx'
import Browse     from './pages/Browse.jsx'
import Calls      from './pages/Calls.jsx'
import Messages   from './pages/Messages.jsx'
import Notifs     from './pages/Notifs.jsx'
import ScreenShare from './pages/ScreenShare.jsx'
import Input      from './pages/Input.jsx'
import Screenshot from './pages/Screenshot.jsx'

const TABS = [
  { id:'wireless',    label:'Wireless',     icon:'📡' },
  { id:'device',      label:'Device',       icon:'📱' },
  { id:'apps',        label:'Apps',         icon:'📦' },
  { id:'browse',      label:'Browse',       icon:'🗂'  },
  { id:'calls',       label:'Calls',        icon:'📞' },
  { id:'messages',    label:'Messages',     icon:'💬' },
  { id:'notifs',      label:'Notifications',icon:'🔔' },
  { id:'screenshare', label:'Screen Share', icon:'📺' },
  { id:'input',       label:'Input',        icon:'🎮' },
  { id:'screenshot',  label:'Screenshot',   icon:'📸' },
]

const PAGES = {
  wireless: Wireless, device: Device, apps: Apps, browse: Browse,
  calls: Calls, messages: Messages, notifs: Notifs,
  screenshare: ScreenShare, input: Input, screenshot: Screenshot,
}

export default function App() {
  const [tab, setTab]     = useState('wireless')
  const [dev, setDev]     = useState(null)
  const [busy, setBusy]   = useState(false)

  const refresh = useCallback(async () => {
    setBusy(true)
    try {
      const data = await api.devices()
      const conn = (data.devices || []).filter(d => d.state === 'device')
      if (conn.length) {
        const info = await api.info()
        setDev({ ...conn[0], label: `${info.brand} ${info.model}` })
      } else setDev(null)
    } catch { setDev(null) }
    setBusy(false)
  }, [])

  useEffect(() => { refresh() }, [])

  const Page = PAGES[tab] || Wireless

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',overflow:'hidden',background:'#0d1117'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                   padding:'10px 18px',background:'#161b22',borderBottom:'1px solid #30363d',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22,color:'#00ff88'}}>⚡</span>
          <span style={{fontWeight:700,fontSize:16,color:'#fff'}}>ADB Commander Pro</span>
          <span style={{fontSize:12,color:'#8b949e'}}>Android Debug Bridge Web UI</span>
        </div>
        <button className="btn btn-g" onClick={refresh} disabled={busy}>
          {busy ? <span className="spin">↻</span> : '↻'} Refresh
        </button>
      </div>

      <div style={{display:'flex',flex:1,minHeight:0}}>
        {/* Sidebar */}
        <nav style={{width:160,flexShrink:0,background:'#161b22',borderRight:'1px solid #30363d',
                     display:'flex',flexDirection:'column',overflowY:'auto',paddingTop:6}}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                display:'flex',alignItems:'center',gap:8,padding:'10px 16px',
                background: tab===t.id ? '#21262d' : 'transparent',
                color: tab===t.id ? '#00ff88' : '#8b949e',
                borderRight: tab===t.id ? '2px solid #00ff88' : '2px solid transparent',
                border:'none',cursor:'pointer',fontSize:13,fontWeight:500,
                fontFamily:'inherit',textAlign:'left',width:'100%',transition:'all 0.15s',
              }}
              onMouseEnter={e=>{ if(tab!==t.id){e.currentTarget.style.color='#e6edf3';e.currentTarget.style.background='rgba(33,38,45,0.5)'}}}
              onMouseLeave={e=>{ if(tab!==t.id){e.currentTarget.style.color='#8b949e';e.currentTarget.style.background='transparent'}}}>
              <span style={{fontSize:16,width:20,textAlign:'center'}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        {/* Page */}
        <main style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',overflow:'hidden',background:'#0d1117'}}>
          <Page device={dev} onRefresh={refresh}/>
        </main>
      </div>

      {/* Status bar */}
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'4px 16px',
                   background:'#161b22',borderTop:'1px solid #30363d',fontSize:12,flexShrink:0}}>
        <span style={{fontSize:14, color: dev ? '#00ff88' : '#ff6b6b'}}>●</span>
        {busy
          ? <span style={{color:'#8b949e'}}>Checking…</span>
          : dev
            ? <><span style={{color:'#00ff88',fontFamily:'monospace',fontWeight:600}}>{dev.label}</span>
                <span style={{color:'#8b949e',fontFamily:'monospace'}}>[{dev.address}]</span></>
            : <span style={{color:'#8b949e'}}>No device — connect via Wireless tab</span>
        }
        <span style={{marginLeft:'auto',color: dev?'#00ff88':'#ff6b6b', fontWeight:600}}>
          {dev ? '● Connected' : '● Disconnected'}
        </span>
      </div>
    </div>
  )
}
