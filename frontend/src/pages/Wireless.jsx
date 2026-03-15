import React, { useState, useEffect, useRef } from 'react'
import { api } from '../api.js'

// ── small helpers ─────────────────────────────────────────────
const S = (style) => ({ fontFamily:'inherit', ...style })
const Card = ({ children, style }) => (
  <div className="card" style={{ marginBottom:14, ...style }}>{children}</div>
)
const SectionTitle = ({ color='#58a6ff', children }) => (
  <div style={{ color, fontWeight:600, marginBottom:12, fontSize:14 }}>{children}</div>
)
const MsgBox = ({ msg }) => msg
  ? <div className={msg.ok?'msg-ok':'msg-err'} style={{ marginBottom:14 }}>{msg.t}</div>
  : null

// ── QR Code display ───────────────────────────────────────────
function QRBox({ url, label }) {
  if (!url) return null
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  background:'#fff', borderRadius:8, padding:10, gap:6 }}>
      <img src={url} alt="QR" style={{ width:120, height:120, imageRendering:'pixelated' }}/>
      <div style={{ fontSize:10, color:'#333', textAlign:'center', maxWidth:130,
                    wordBreak:'break-all', lineHeight:'1.4' }}>{label}</div>
    </div>
  )
}

// ── URL copy row ──────────────────────────────────────────────
function UrlRow({ label, url, color='#00ff88' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8,
                  background:'#0d1117', borderRadius:6, padding:'8px 12px' }}>
      <span style={{ fontSize:11, color:'#8b949e', width:130, flexShrink:0 }}>{label}</span>
      <a href={url} target="_blank" rel="noreferrer"
         style={{ flex:1, fontFamily:'monospace', fontSize:12, color, overflow:'hidden',
                  textOverflow:'ellipsis', whiteSpace:'nowrap', textDecoration:'none' }}>
        {url}
      </a>
      <button onClick={copy}
        style={{ background:'transparent', border:'1px solid #30363d', color:'#8b949e',
                 borderRadius:4, padding:'2px 8px', fontSize:11, cursor:'pointer',
                 fontFamily:'inherit', flexShrink:0 }}>
        {copied ? '✓ Copied' : 'Copy'}
      </button>
      <button onClick={() => window.open(url, '_blank')}
        style={{ background:'transparent', border:'1px solid #30363d', color:'#58a6ff',
                 borderRadius:4, padding:'2px 8px', fontSize:11, cursor:'pointer',
                 fontFamily:'inherit', flexShrink:0 }}>
        Open ↗
      </button>
    </div>
  )
}

// ── main component ────────────────────────────────────────────
export default function Wireless({ onRefresh }) {
  // ADB connect
  const [devs, setDevs]     = useState([])
  const [host, setHost]     = useState('')
  const [port, setPort]     = useState('5555')
  const [ph, setPh]         = useState('')
  const [pp, setPp]         = useState('')
  const [pc, setPc]         = useState('')
  const [msg, setMsg]       = useState(null)
  const [loading, setLoading] = useState(false)

  // Network / Remote
  const [netInfo, setNetInfo]       = useState(null)
  const [tunnelActive, setTunActive]= useState(false)
  const [tunnels, setTunnels]       = useState([])
  const [ngrokToken, setNgrokToken] = useState('')
  const [tunnelBusy, setTBusy]      = useState(false)
  const [tunnelMsg, setTMsg]        = useState(null)
  const [activeTab, setActiveTab]   = useState('connect')   // connect | remote
  const pollRef = useRef(null)

  const loadDevs = async () => {
    try { const d = await api.devices(); setDevs(d.devices||[]) } catch { setDevs([]) }
  }

  const loadNet = async () => {
    try { const d = await api.networkInfo(); setNetInfo(d); setTunActive(d.tunnel_active); setTunnels(d.tunnels||[]) }
    catch {}
  }

  useEffect(() => {
    loadDevs()
    loadNet()
  }, [])

  // Poll tunnel status when active
  useEffect(() => {
    if (tunnelActive) {
      pollRef.current = setInterval(async () => {
        try { const d = await api.tunnelStatus(); setTunActive(d.active); setTunnels(d.tunnels||[]) }
        catch {}
      }, 10000)
    }
    return () => clearInterval(pollRef.current)
  }, [tunnelActive])

  const ok  = t => setMsg({ t, ok:true })
  const err = t => setMsg({ t, ok:false })

  const connect = async () => {
    if (!host) return
    setLoading(true)
    const r = await api.connect(host, parseInt(port)||5555)
    r.success ? ok(r.message) : err(r.message)
    if (r.success) { onRefresh?.(); loadDevs() }
    setLoading(false)
  }

  const tcpip = async () => {
    const r = await api.tcpip()
    ok(r.message + (r.ip ? `  —  Device IP: ${r.ip}` : ''))
    if (r.ip) setHost(r.ip)
  }

  const pair = async () => {
    setLoading(true)
    const r = await api.pair(ph, parseInt(pp)||5555, pc)
    r.success ? ok(r.message) : err(r.message)
    setLoading(false)
  }

  const disc = async (addr) => {
    const [h,p] = addr.split(':')
    const r = await api.disconnect(h, parseInt(p)||5555)
    r.success ? ok(r.message) : err(r.message)
    loadDevs()
  }

  const startTunnel = async () => {
    setTBusy(true); setTMsg(null)
    const r = await api.startTunnel(ngrokToken)
    if (r.success) {
      setTunActive(true); setTunnels(r.tunnels||[])
      setTMsg({ t:'✓ Tunnels live! Share the Frontend URL with anyone.', ok:true })
    } else {
      setTMsg({ t: r.message, ok:false })
    }
    setTBusy(false)
  }

  const stopTunnel = async () => {
    setTBusy(true)
    await api.stopTunnel()
    setTunActive(false); setTunnels([])
    setTMsg({ t:'Tunnels stopped.', ok:true })
    setTBusy(false)
  }

  // ── styles ──
  const tabBtn = (id) => ({
    padding:'7px 18px', border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
    fontFamily:'inherit', borderRadius:'6px 6px 0 0', transition:'all 0.15s',
    background: activeTab===id ? '#21262d' : 'transparent',
    color:       activeTab===id ? '#00ff88' : '#8b949e',
    borderBottom: activeTab===id ? '2px solid #00ff88' : '2px solid transparent',
  })

  return (
    <div style={{ overflowY:'auto', height:'100%', padding:20, maxWidth:780 }}>

      {/* Tab switcher */}
      <div style={{ display:'flex', gap:0, marginBottom:16, borderBottom:'1px solid #30363d' }}>
        <button style={tabBtn('connect')} onClick={()=>setActiveTab('connect')}>📡 ADB Connect</button>
        <button style={tabBtn('remote')}  onClick={()=>setActiveTab('remote')}>
          🌐 Remote Access
          {tunnelActive && <span style={{ marginLeft:6, width:8, height:8, background:'#00ff88',
            borderRadius:'50%', display:'inline-block', verticalAlign:'middle' }}/>}
        </button>
      </div>

      {/* ══════════════════ ADB CONNECT TAB ══════════════════ */}
      {activeTab === 'connect' && (
        <>
          <Card>
            <SectionTitle>Connect to Device (WiFi)</SectionTitle>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <input className="inp" style={{ flex:1, minWidth:150 }}
                placeholder="Device IP e.g. 192.168.1.100"
                value={host} onChange={e=>setHost(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&connect()}/>
              <input className="inp" style={{ width:70 }} placeholder="Port"
                value={port} onChange={e=>setPort(e.target.value)}/>
              <button className="btn btn-g" onClick={connect} disabled={loading||!host}>
                {loading ? <span className="spin">↻</span> : '⚡'} Connect
              </button>
              <button className="btn btn-b" onClick={tcpip}>📶 Enable TCP/IP</button>
            </div>
            <div style={{ fontSize:11, color:'#8b949e', marginTop:8 }}>
              Step 1: Plug phone via USB → click Enable TCP/IP → unplug → click Connect
            </div>
          </Card>

          <Card>
            <SectionTitle color="#ffa657">Android 11+ Wireless Pairing</SectionTitle>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              <input className="inp" style={{ flex:1, minWidth:120 }} placeholder="Pair IP"
                value={ph} onChange={e=>setPh(e.target.value)}/>
              <input className="inp" style={{ width:85 }} placeholder="Pair Port"
                value={pp} onChange={e=>setPp(e.target.value)}/>
              <input className="inp" style={{ width:110 }} placeholder="6-digit code"
                value={pc} onChange={e=>setPc(e.target.value)}/>
              <button className="btn btn-o" onClick={pair} disabled={loading}>🔑 Pair</button>
            </div>
            <div style={{ fontSize:11, color:'#8b949e', marginTop:8 }}>
              Settings → Developer Options → Wireless Debugging → Pair device with code
            </div>
          </Card>

          <MsgBox msg={msg}/>

          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <SectionTitle style={{ margin:0 }}>Connected Devices</SectionTitle>
              <button className="btn btn-b" style={{ fontSize:12, padding:'4px 10px' }} onClick={loadDevs}>↻ Refresh</button>
            </div>
            {devs.length===0
              ? <div style={{ color:'#8b949e', textAlign:'center', padding:'20px 0', fontSize:13 }}>No devices found</div>
              : devs.map((d,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                                      background:'#21262d', borderRadius:6, padding:'10px 14px', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ fontSize:22 }}>{d.type==='wifi'?'📡':'🔌'}</span>
                    <div>
                      <div style={{ fontFamily:'monospace', color:'#fff', fontSize:13 }}>{d.address}</div>
                      <div style={{ fontSize:11, color:'#8b949e' }}>{d.type==='wifi'?'WiFi':'USB'} — {d.state}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ padding:'2px 8px', borderRadius:4, fontSize:11,
                      background: d.state==='device'?'rgba(0,255,136,0.15)':'rgba(255,107,107,0.15)',
                      color:      d.state==='device'?'#00ff88':'#ff6b6b' }}>{d.state}</span>
                    {d.type==='wifi' && (
                      <button className="btn btn-r" style={{ fontSize:12, padding:'4px 10px' }}
                        onClick={()=>disc(d.address)}>Disconnect</button>
                    )}
                  </div>
                </div>
              ))
            }
          </Card>
        </>
      )}

      {/* ══════════════════ REMOTE ACCESS TAB ══════════════════ */}
      {activeTab === 'remote' && (
        <>
          {/* Network addresses */}
          <Card>
            <SectionTitle>🌐 Your Server Addresses</SectionTitle>
            {netInfo ? (
              <>
                {/* LAN addresses */}
                {netInfo.local_ips?.length > 0 && (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, color:'#8b949e', marginBottom:6 }}>
                      📶 Local Network (same WiFi)
                    </div>
                    {netInfo.local_ips.map((ip,i) => (
                      <UrlRow key={i} label={`LAN — ${ip}`}
                        url={`http://${ip}:5173`} color="#00ff88"/>
                    ))}
                  </div>
                )}

                {/* Tailscale */}
                {netInfo.tailscale ? (
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, color:'#8b949e', marginBottom:6 }}>
                      🔐 Tailscale (any network)
                    </div>
                    <UrlRow label="Tailscale IP" url={`http://${netInfo.tailscale}:5173`} color="#58a6ff"/>
                    <div style={{ fontSize:11, color:'#00ff88', marginTop:4 }}>
                      ✓ Tailscale detected — you can access this from any network!
                    </div>
                  </div>
                ) : (
                  <div style={{ background:'rgba(88,166,255,0.08)', border:'1px solid rgba(88,166,255,0.2)',
                                borderRadius:6, padding:'10px 14px', marginBottom:12 }}>
                    <div style={{ color:'#58a6ff', fontWeight:600, fontSize:13, marginBottom:4 }}>
                      💡 Tailscale not detected
                    </div>
                    <div style={{ fontSize:12, color:'#8b949e', lineHeight:'1.6' }}>
                      Install Tailscale on this PC + your other devices for easy cross-network access.
                      Free at <a href="https://tailscale.com" target="_blank" rel="noreferrer"
                        style={{ color:'#58a6ff' }}>tailscale.com</a>
                    </div>
                  </div>
                )}

                {/* ngrok tunnels (if active) */}
                {tunnelActive && tunnels.length > 0 && (
                  <div>
                    <div style={{ fontSize:12, color:'#8b949e', marginBottom:6 }}>
                      🚇 ngrok Tunnels (internet — anyone can access)
                    </div>
                    {tunnels.map((t,i) => (
                      <UrlRow key={i} label={t.label} url={t.url} color="#ffa657"/>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color:'#8b949e', fontSize:13 }}>Loading network info…</div>
            )}
            <button className="btn btn-b" style={{ marginTop:10, fontSize:12, padding:'4px 10px' }}
              onClick={loadNet}>↻ Refresh</button>
          </Card>

          {/* ngrok tunnel launcher */}
          <Card>
            <SectionTitle color="#ffa657">🚇 ngrok Tunnel — Access from Anywhere</SectionTitle>
            <div style={{ fontSize:12, color:'#8b949e', marginBottom:12, lineHeight:'1.6' }}>
              Creates a public HTTPS URL so you can open this app from any device, anywhere in the world.
              No port forwarding or VPN needed.
            </div>

            {!tunnelActive ? (
              <>
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:12, color:'#8b949e', marginBottom:6 }}>
                    ngrok Auth Token{' '}
                    <span style={{ color:'#30363d' }}>
                      (optional — free at{' '}
                      <a href="https://dashboard.ngrok.com" target="_blank" rel="noreferrer"
                         style={{ color:'#58a6ff' }}>dashboard.ngrok.com</a>)
                    </span>
                  </div>
                  <input className="inp" style={{ width:'100%' }}
                    placeholder="Paste token here for longer sessions (optional)"
                    value={ngrokToken} onChange={e=>setNgrokToken(e.target.value)}/>
                  <div style={{ fontSize:11, color:'#8b949e', marginTop:4 }}>
                    Without a token: 2hr sessions. With free token: unlimited sessions.
                  </div>
                </div>
                <button className="btn btn-o" onClick={startTunnel} disabled={tunnelBusy}
                  style={{ fontSize:14, padding:'8px 20px' }}>
                  {tunnelBusy ? <><span className="spin">↻</span> Starting…</> : '🚀 Start Public Tunnel'}
                </button>
              </>
            ) : (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                  <span style={{ width:10, height:10, background:'#00ff88', borderRadius:'50%',
                                  display:'inline-block', flexShrink:0 }}/>
                  <span style={{ color:'#00ff88', fontWeight:600, fontSize:13 }}>Tunnels are LIVE</span>
                  <button className="btn btn-r" style={{ marginLeft:'auto', fontSize:12, padding:'4px 12px' }}
                    onClick={stopTunnel} disabled={tunnelBusy}>
                    ⏹ Stop Tunnels
                  </button>
                </div>

                {/* QR codes */}
                {tunnels.filter(t=>t.qr).length > 0 && (
                  <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:14 }}>
                    {tunnels.map((t,i) => t.qr && (
                      <QRBox key={i} url={t.qr} label={`${t.label}\n${t.url}`}/>
                    ))}
                  </div>
                )}

                {/* URLs */}
                {tunnels.map((t,i) => (
                  <UrlRow key={i} label={t.label} url={t.url} color="#ffa657"/>
                ))}
              </div>
            )}

            {tunnelMsg && <div className={tunnelMsg.ok?'msg-ok':'msg-err'} style={{ marginTop:12 }}>{tunnelMsg.t}</div>}
          </Card>

          {/* How-to guide */}
          <Card>
            <SectionTitle color="#8b949e">📖 How to access from a different network</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {[
                { icon:'🔌', title:'USB (easiest)', steps:[
                  'Plug phone into PC via USB',
                  'Open localhost:5173 on the same PC',
                  'Full speed, no network needed'
                ], color:'#00ff88' },
                { icon:'📶', title:'Same WiFi', steps:[
                  'PC and phone on same router',
                  'Use LAN IP shown above',
                  'e.g. http://192.168.x.x:5173'
                ], color:'#00ff88' },
                { icon:'🚇', title:'ngrok Tunnel', steps:[
                  'Click Start Public Tunnel above',
                  'Get a public https://xxx.ngrok.io URL',
                  'Share with anyone, anywhere'
                ], color:'#ffa657' },
                { icon:'🔐', title:'Tailscale VPN', steps:[
                  'Install Tailscale on this PC',
                  'Install on other devices too',
                  'Access via Tailscale IP: 100.x.x.x'
                ], color:'#58a6ff' },
              ].map((opt,i) => (
                <div key={i} style={{ background:'#0d1117', borderRadius:6, padding:'12px 14px',
                                      border:`1px solid ${opt.color}22` }}>
                  <div style={{ fontSize:13, fontWeight:600, color:opt.color, marginBottom:8 }}>
                    {opt.icon} {opt.title}
                  </div>
                  {opt.steps.map((s,j) => (
                    <div key={j} style={{ fontSize:12, color:'#8b949e', marginBottom:3,
                                          display:'flex', gap:6 }}>
                      <span style={{ color:opt.color, flexShrink:0 }}>{j+1}.</span>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div style={{ marginTop:12, background:'rgba(255,107,107,0.08)', borderRadius:6,
                          padding:'10px 14px', border:'1px solid rgba(255,107,107,0.2)' }}>
              <div style={{ color:'#ff6b6b', fontWeight:600, fontSize:12, marginBottom:4 }}>
                ⚠ Important: ADB still needs to reach your phone
              </div>
              <div style={{ fontSize:12, color:'#8b949e', lineHeight:'1.6' }}>
                The web UI can be accessed remotely via ngrok/Tailscale, but <strong style={{ color:'#e6edf3' }}>
                ADB commands run on the PC where the backend is installed</strong>. Your phone must still be
                connected to that PC — either via USB cable (best) or same WiFi as the PC running the backend.
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
