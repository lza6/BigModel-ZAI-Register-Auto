// 改良: 亮黄色字检测(适应多种背景) + dump 图给人工确认映射
const WebSocket = require('ws');
const fs = require('fs');
const { PNG } = require('pngjs');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('bigmodel'));
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256*1024*1024 });
  let id = 0; const waiters = {};
  const send = (m, p = {}) => new Promise(res => { const i = ++id; waiters[i] = res; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.on('message', d => { const m = JSON.parse(d); if (m.id && waiters[m.id]) { waiters[m.id](m.result); delete waiters[m.id]; } });
  await new Promise(r => ws.on('open', r));
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;
  const rect = JSON.parse(await ev(`JSON.stringify((()=>{const i=[...document.images].find(i=>i.width>250&&i.height>180); const b=i.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}})())`));
  const shot = await send('Page.captureScreenshot', { format: 'png', clip: { x: rect.x, y: rect.y, width: rect.w, height: rect.h, scale: 1 } });
  fs.writeFileSync('auto-captcha.png', Buffer.from(shot.data, 'base64'));
  const png = PNG.sync.read(fs.readFileSync('auto-captcha.png'));
  const { width, height, data } = png;
  // 亮黄/橙字: 高R高G低B, 或非常亮
  const pts = [];
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    const R = data[i], G = data[i+1], B = data[i+2];
    if ((R > 180 && G > 140 && B < 110) || (R > 220 && G > 180 && B < 150)) pts.push([x, y]);
  }
  const clusters = [];
  for (const [x, y] of pts) {
    let c = clusters.find(c => Math.abs(c.cx - x) < 45 && Math.abs(c.cy - y) < 45);
    if (c) { c.cx = (c.cx * c.n + x) / (c.n + 1); c.cy = (c.cy * c.n + y) / (c.n + 1); c.n++; }
    else clusters.push({ cx: x, cy: y, n: 1 });
  }
  const valid = clusters.filter(c => c.n > 80).sort((a, b) => b.n - a.n).slice(0, 6);
  console.log('clusters:', valid.map((c,i)=>`#${i}:${(c.cx/width).toFixed(3)},${(c.cy/height).toFixed(3)}(n=${c.n})`).join(' '));
  process.exit(0);
})();
