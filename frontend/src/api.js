const B = '/api'

// Always bypass browser cache for device data
async function call(method, path, body, blob=false) {
  const o = {
    method,
    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' },
    cache: 'no-store',
  }
  if (body instanceof FormData) {
    o.body = body
  } else if (body) {
    o.headers['Content-Type'] = 'application/json'
    o.body = JSON.stringify(body)
  }
  // Add timestamp to bust any proxy/CDN cache on GET requests
  let url = B + path
  if (method === 'GET' && !blob) {
    url += (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
  }
  const r = await fetch(url, o)
  if (blob) return r.blob()
  if (!r.ok) { const t = await r.text(); throw new Error(t || r.statusText) }
  return r.json()
}

const G = p => call('GET', p)
const P = (p,b) => call('POST', p, b)
const D = p => call('DELETE', p)

export const api = {
  // Wireless
  devices:     ()          => G('/wireless/devices'),
  connect:     (host,port) => P('/wireless/connect',    {host, port}),
  disconnect:  (host,port) => P('/wireless/disconnect', {host, port}),
  tcpip:       ()          => P('/wireless/tcpip'),
  pair:        (host,port,code) => P('/wireless/pair',  {host, port, code}),

  // Device
  info:        () => G('/device/info'),
  battery:     () => G('/device/battery'),
  storage:     () => G('/device/storage'),
  reboot:      (mode) => P(`/device/reboot?mode=${mode||'normal'}`),

  // Apps
  apps:        (filter,q) => G(`/apps/?filter=${filter||'all'}&q=${encodeURIComponent(q||'')}`),
  stopApp:     (pkg) => P(`/apps/${pkg}/stop`),
  launchApp:   (pkg) => P(`/apps/${pkg}/launch`),
  dumpsys:     (pkg) => G(`/apps/${pkg}/dumpsys`),
  pullApk:     (pkg) => call('GET', `/apps/${pkg}/apk`, null, true),

  // Files
  ls:          (path) => G(`/files/list?path=${encodeURIComponent(path)}`),
  download:    (path) => call('GET', `/files/download?path=${encodeURIComponent(path)}`, null, true),
  thumbUrl:    (path) => `${B}/files/thumb?path=${encodeURIComponent(path)}&t=${Date.now()}`,
  upload:      (dest, file) => {
    const fd = new FormData(); fd.append('file', file)
    return call('POST', `/files/upload?dest_path=${encodeURIComponent(dest)}`, fd)
  },
  rm:          (path) => call('DELETE', `/files/?path=${encodeURIComponent(path)}`),

  // Calls
  calls:       () => G('/calls/'),
  clearCalls:  () => D('/calls/'),
  exportCalls: () => window.open('/api/calls/export?_t=' + Date.now()),

  // Messages
  messages:    (box) => G(`/messages/?box=${box||'all'}`),
  sendSMS:     (number,message) => P('/messages/send', {number,message}),
  exportSMS:   (box) => window.open(`/api/messages/export?box=${box||'all'}&_t=${Date.now()}`),

  // Notifications
  notifs:      () => G('/notifs/'),
  dismiss:     () => D('/notifs/'),

  // Screen
  screenshot:  () => call('GET', '/screen/shot', null, true),
  recStart:    () => P('/screen/record/start'),
  recStop:     () => call('POST', '/screen/record/stop', null, true),

  // Input
  tap:         (x,y)   => P('/input/tap',   {x,y}),
  swipe:       (x1,y1,x2,y2,ms) => P('/input/swipe', {x1,y1,x2,y2,ms:ms||300}),
  typeText:    (text)  => P('/input/text',  {text}),
  sendKey:     (keycode) => P('/input/key', {keycode}),

  // Tunnel / Remote Access
  networkInfo:  () => G('/tunnel/network'),
  startTunnel:  (auth_token='') => P(`/tunnel/start?auth_token=${encodeURIComponent(auth_token)}`),
  stopTunnel:   () => P('/tunnel/stop'),
  tunnelStatus: () => G('/tunnel/status'),
}
