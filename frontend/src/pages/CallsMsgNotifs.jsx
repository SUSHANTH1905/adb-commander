import React, { useState, useMemo, useRef, useEffect } from 'react'
import { api } from '../api.js'

const fmtTime = () => new Date().toLocaleTimeString()

// ── Calls ────────────────────────────────────────────────────
export function Calls() {
  const [calls, setCalls]   = useState([])
  const [q, setQ]           = useState('')
  const [type, setType]     = useState('All')
  const [busy, setBusy]     = useState(false)
  const [msg, setMsg]       = useState(null)
  const [loadedAt, setLoadedAt] = useState(null)

  const load = async () => {
    setBusy(true); setMsg(null); setCalls([])
    try {
      const d = await api.calls()
      const list = d.calls || []
      setCalls(list)
      setLoadedAt(fmtTime())
      if (d.error) {
        setMsg({ t: d.error, ok: false })
      } else {
        const inc = list.filter(c => c.type === 'Incoming').length
        const out = list.filter(c => c.type === 'Outgoing').length
        const mis = list.filter(c => c.type === 'Missed').length
        setMsg({ t: `✓ ${d.total} calls  •  📥 ${inc} Incoming  📤 ${out} Outgoing  ❌ ${mis} Missed`, ok: true })
      }
    } catch(e) { setMsg({ t: e.message, ok: false }) }
    setBusy(false)
  }

  const clear = async () => {
    if (!confirm('Delete ALL call logs on device?')) return
    const r = await api.clearCalls()
    setMsg({ t: r.message, ok: r.success })
    if (r.success) { setCalls([]); setLoadedAt(null) }
  }

  const visible = useMemo(() => calls.filter(c => {
    if (type !== 'All' && c.type !== type) return false
    if (q && !`${c.number} ${c.name}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [calls, q, type])

  const pillCls = { Incoming: 'pill-in', Outgoing: 'pill-out', Missed: 'pill-miss' }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#161b22',
                    borderBottom:'1px solid #30363d', flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
        <button className="btn btn-g" onClick={load} disabled={busy}>
          {busy ? <span className="spin">↻</span> : '🔄'} Load Calls
        </button>
        <button className="btn btn-b" onClick={api.exportCalls}>💾 Export CSV</button>
        <button className="btn btn-r" onClick={clear}>🗑 Clear Log</button>
        <input className="inp" style={{ width:180 }} placeholder="Search name/number…"
          value={q} onChange={e => setQ(e.target.value)} />
        <select className="inp" value={type} onChange={e => setType(e.target.value)}>
          {['All','Incoming','Outgoing','Missed'].map(t => <option key={t}>{t}</option>)}
        </select>
        {loadedAt && (
          <span style={{ marginLeft:'auto', fontSize:11, color:'#8b949e', fontFamily:'monospace' }}>
            Last loaded: {loadedAt}
            {visible.length !== calls.length && ` • Showing ${visible.length} of ${calls.length}`}
          </span>
        )}
      </div>

      {msg && (
        <div className={msg.ok ? 'msg-ok' : 'msg-err'}
             style={{ margin:'6px 14px', flexShrink:0 }}>{msg.t}</div>
      )}

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {busy ? (
          <div style={{ textAlign:'center', color:'#8b949e', padding:'60px 0', fontSize:14 }}>
            <span className="spin" style={{ fontSize:24, display:'block', marginBottom:10 }}>↻</span>
            Querying device call log…
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width:100 }}>Type</th>
                <th style={{ width:160 }}>Number</th>
                <th>Name</th>
                <th style={{ width:90 }}>Duration</th>
                <th style={{ width:150 }}>Date</th>
                <th style={{ width:50 }}>SIM</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((c, i) => (
                <tr key={i}>
                  <td>
                    <span className={pillCls[c.type] || ''}
                          style={{ display:'inline-block', minWidth:64, textAlign:'center' }}>
                      {c.type}
                    </span>
                  </td>
                  <td style={{ fontFamily:'monospace', fontSize:12 }}>{c.number}</td>
                  <td style={{ fontSize:13 }}>{c.name}</td>
                  <td style={{ color:'#8b949e', fontSize:12 }}>{c.duration}</td>
                  <td style={{ color:'#8b949e', fontSize:12, whiteSpace:'nowrap' }}>{c.date}</td>
                  <td style={{ color:'#8b949e', fontSize:12, textAlign:'center' }}>{c.sim}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!busy && calls.length === 0 && (
          <div style={{ textAlign:'center', color:'#8b949e', padding:'60px 0', fontSize:13 }}>
            Click <strong style={{ color:'#00ff88' }}>Load Calls</strong> to fetch call history from device
          </div>
        )}
        {!busy && calls.length > 0 && visible.length === 0 && (
          <div style={{ textAlign:'center', color:'#8b949e', padding:'40px 0', fontSize:13 }}>
            No calls match the current filter
          </div>
        )}
      </div>
    </div>
  )
}

// ── Messages ─────────────────────────────────────────────────
export function Messages() {
  const [threads, setThreads]   = useState([])
  const [msgs, setMsgs]         = useState([])
  const [addr, setAddr]         = useState(null)
  const [q, setQ]               = useState('')
  const [busy, setBusy]         = useState(false)
  const [showSend, setShowSend] = useState(false)
  const [snum, setSnum]         = useState('')
  const [stxt, setStxt]         = useState('')
  const [msg, setMsg]           = useState(null)
  const [loadedAt, setLoadedAt] = useState(null)
  const botRef = useRef(null)

  const load = async (box = 'all') => {
    setBusy(true); setMsg(null); setAddr(null); setMsgs([]); setThreads([])
    try {
      const d = await api.messages(box)
      setMsgs(d.messages || [])
      setThreads(d.threads || [])
      setLoadedAt(fmtTime())
      setMsg({ t: `✓ ${d.total} messages`, ok: true })
    } catch(e) { setMsg({ t: e.message, ok: false }) }
    setBusy(false)
  }

  const filteredThreads = useMemo(() => {
    if (!q) return threads
    return threads.filter(t =>
      t.address.toLowerCase().includes(q.toLowerCase()) ||
      t.last.toLowerCase().includes(q.toLowerCase()))
  }, [threads, q])

  const convo = useMemo(() => {
    if (!addr) return []
    // show oldest→newest within a conversation
    return msgs
      .filter(m => m.address === addr)
      .reverse()
  }, [msgs, addr])

  useEffect(() => {
    botRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [convo])

  const send = async () => {
    if (!snum || !stxt) return
    const r = await api.sendSMS(snum, stxt)
    setMsg({ t: r.message, ok: r.success })
    if (r.success) { setStxt(''); setShowSend(false) }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#161b22',
                    borderBottom:'1px solid #30363d', flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
        <button className="btn btn-g" onClick={() => load('all')} disabled={busy}>
          {busy ? <span className="spin">↻</span> : '🔄'} Load All
        </button>
        <button className="btn btn-b" onClick={() => load('inbox')}>📥 Inbox</button>
        <button className="btn btn-o" onClick={() => load('sent')}>📤 Sent</button>
        <button className="btn btn-b" onClick={() => api.exportSMS('all')}>💾 Export</button>
        <button className="btn btn-g" style={{ marginLeft:'auto' }}
          onClick={() => setShowSend(s => !s)}>📨 Send SMS</button>
        {loadedAt && (
          <span style={{ fontSize:11, color:'#8b949e', fontFamily:'monospace' }}>
            Loaded: {loadedAt}
          </span>
        )}
      </div>

      {/* Send SMS panel */}
      {showSend && (
        <div style={{ display:'flex', gap:8, padding:'8px 14px', background:'#21262d',
                      borderBottom:'1px solid #30363d', flexShrink:0 }}>
          <input className="inp" style={{ width:140 }} placeholder="Number"
            value={snum} onChange={e => setSnum(e.target.value)} />
          <input className="inp" style={{ flex:1 }} placeholder="Message…"
            value={stxt} onChange={e => setStxt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="btn btn-g" onClick={send}>Send</button>
          <button className="btn btn-r" onClick={() => setShowSend(false)}>✕</button>
        </div>
      )}

      {msg && (
        <div className={msg.ok ? 'msg-ok' : 'msg-err'}
             style={{ margin:'6px 14px', flexShrink:0 }}>{msg.t}</div>
      )}

      <div style={{ display:'flex', flex:1, minHeight:0 }}>
        {/* Thread list */}
        <div style={{ width:230, flexShrink:0, background:'#161b22',
                      borderRight:'1px solid #30363d', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'8px 12px', borderBottom:'1px solid #30363d', flexShrink:0 }}>
            <input className="inp" style={{ width:'100%', fontSize:12 }} placeholder="Search…"
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div style={{ fontSize:10, color:'#8b949e', padding:'8px 12px 4px',
                        fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>
            Conversations ({filteredThreads.length})
          </div>
          <div style={{ flex:1, overflowY:'auto' }}>
            {busy ? (
              <div style={{ textAlign:'center', color:'#8b949e', padding:'30px 0', fontSize:13 }}>
                <span className="spin" style={{ display:'block', marginBottom:8 }}>↻</span>
                Loading…
              </div>
            ) : filteredThreads.map((t, i) => (
              <div key={i} onClick={() => setAddr(t.address)}
                style={{
                  padding:'10px 14px', cursor:'pointer',
                  borderBottom:'1px solid rgba(48,54,61,0.5)',
                  borderLeft: addr === t.address ? '2px solid #00ff88' : '2px solid transparent',
                  background: addr === t.address ? '#21262d' : 'transparent',
                  transition:'all 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#21262d'}
                onMouseLeave={e => { if (addr !== t.address) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ fontSize:13, color:'#fff', overflow:'hidden',
                              textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.address}</div>
                <div style={{ fontSize:11, color:'#8b949e', marginTop:2, overflow:'hidden',
                              textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.last}</div>
                <div style={{ fontSize:11, color:'#58a6ff', marginTop:1 }}>{t.count} msgs</div>
              </div>
            ))}
            {!busy && threads.length === 0 && (
              <div style={{ color:'#8b949e', fontSize:12, textAlign:'center', padding:'30px 0' }}>
                Load messages first
              </div>
            )}
          </div>
        </div>

        {/* Conversation view */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
          {addr ? (
            <>
              <div style={{ padding:'10px 16px', borderBottom:'1px solid #30363d',
                            background:'#161b22', flexShrink:0 }}>
                <span style={{ fontWeight:600, color:'#fff' }}>{addr}</span>
                <span style={{ color:'#8b949e', fontSize:12, marginLeft:8 }}>
                  {convo.length} messages
                </span>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'14px 16px',
                            display:'flex', flexDirection:'column', gap:8 }}>
                {convo.map((m, i) => (
                  <div key={i} style={{
                    display:'flex', flexDirection:'column',
                    alignItems: m.direction === 'out' ? 'flex-end' : 'flex-start'
                  }}>
                    <div className={m.direction === 'out' ? 'bub-out' : 'bub-in'}>
                      {m.body || <em style={{ color:'#8b949e' }}>Empty</em>}
                    </div>
                    <div style={{ fontSize:10, color:'#8b949e', marginTop:2, padding:'0 4px' }}>
                      {m.date}
                    </div>
                  </div>
                ))}
                <div ref={botRef} />
              </div>
            </>
          ) : (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                          color:'#8b949e', fontSize:14, flexDirection:'column', gap:8 }}>
              <span style={{ fontSize:40 }}>💬</span>
              Select a conversation to read messages
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Notifs ───────────────────────────────────────────────────
export function Notifs() {
  const [notifs, setNotifs]   = useState([])
  const [q, setQ]             = useState('')
  const [busy, setBusy]       = useState(false)
  const [msg, setMsg]         = useState(null)
  const [loadedAt, setLoadedAt] = useState(null)
  const [autoOn, setAutoOn]   = useState(false)
  const timer = useRef(null)

  const load = async () => {
    setBusy(true)
    try {
      const d = await api.notifs()
      setNotifs(d.notifications || [])
      setLoadedAt(fmtTime())
      setMsg({ t: `✓ ${d.total} notifications`, ok: true })
    } catch(e) { setMsg({ t: e.message, ok: false }) }
    setBusy(false)
  }

  const startAuto = () => {
    setAutoOn(true)
    load()
    timer.current = setInterval(load, 5000)
  }
  const stopAuto = () => {
    setAutoOn(false)
    clearInterval(timer.current)
  }
  useEffect(() => () => clearInterval(timer.current), [])

  const dismiss = async () => {
    await api.dismiss()
    setNotifs([])
    setMsg({ t: 'All notifications dismissed', ok: true })
  }

  const visible = notifs.filter(n =>
    !q || [n.app, n.title, n.text].join(' ').toLowerCase().includes(q.toLowerCase()))

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', gap:8, padding:'10px 14px', background:'#161b22',
                    borderBottom:'1px solid #30363d', flexWrap:'wrap', alignItems:'center', flexShrink:0 }}>
        <button className="btn btn-g" onClick={load} disabled={busy}>
          {busy ? <span className="spin">↻</span> : '🔄'} Load
        </button>
        <button className="btn btn-b" onClick={startAuto} disabled={autoOn}>
          {autoOn ? <span className="spin">↻</span> : '▶'} Auto (5s)
        </button>
        <button className="btn btn-r" onClick={stopAuto} disabled={!autoOn}>⏹ Stop</button>
        <input className="inp" style={{ width:180 }} placeholder="Filter…"
          value={q} onChange={e => setQ(e.target.value)} />
        {autoOn && (
          <span style={{ fontSize:11, color:'#00ff88', fontFamily:'monospace' }}>
            ● Live — updated {loadedAt}
          </span>
        )}
        {!autoOn && loadedAt && (
          <span style={{ fontSize:11, color:'#8b949e', fontFamily:'monospace' }}>
            Loaded: {loadedAt}
          </span>
        )}
        <button className="btn btn-r" style={{ marginLeft:'auto' }} onClick={dismiss}>
          🗑 Dismiss All
        </button>
      </div>
      {msg && (
        <div className={msg.ok ? 'msg-ok' : 'msg-err'}
             style={{ margin:'6px 14px', flexShrink:0 }}>{msg.t}</div>
      )}
      <div style={{ flex:1, overflowY:'auto' }}>
        {busy && notifs.length === 0 ? (
          <div style={{ textAlign:'center', color:'#8b949e', padding:'60px 0', fontSize:13 }}>
            <span className="spin" style={{ fontSize:24, display:'block', marginBottom:10 }}>↻</span>
            Reading notifications…
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width:180 }}>App</th>
                <th style={{ width:200 }}>Title</th>
                <th>Text</th>
                <th style={{ width:90 }}>Time</th>
                <th style={{ width:70 }}>Priority</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((n, i) => (
                <tr key={i}>
                  <td style={{ fontFamily:'monospace', fontSize:11, color:'#58a6ff' }}>{n.app}</td>
                  <td style={{ fontSize:13 }}>{n.title}</td>
                  <td style={{ fontSize:12, color:'#8b949e', maxWidth:300,
                               overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {n.text}
                  </td>
                  <td style={{ fontSize:12, color:'#8b949e', whiteSpace:'nowrap' }}>{n.time}</td>
                  <td style={{ fontSize:12, color:'#8b949e', textAlign:'center' }}>{n.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!busy && notifs.length === 0 && (
          <div style={{ textAlign:'center', color:'#8b949e', padding:'60px 0', fontSize:13 }}>
            Click <strong style={{ color:'#00ff88' }}>Load</strong> to fetch notifications
          </div>
        )}
      </div>
    </div>
  )
}
