// 最终版: 手柄 563,482 中心, dx 参数, 拖后轮询验证状态
const WebSocket = require('ws');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('z.ai'));
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256*1024*1024 });
  let id = 0; const waiters = {};
  const send = (m, p = {}) => new Promise(res => { const i = ++id; waiters[i] = res; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.on('message', d => { const m = JSON.parse(d); if (m.id && waiters[m.id]) { waiters[m.id](m.result); delete waiters[m.id]; } });
  await new Promise(r => ws.on('open', r));
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;
  // 手柄真实 rect
  const h = JSON.parse(await ev(`JSON.stringify((function(){var e=document.querySelector('.slider-move');var r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})())`));
  console.log('handle center:', h);
  const dx = parseInt(process.argv[2]);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: h.x, y: h.y, button: 'left', clickCount: 1 });
  await new Promise(r=>setTimeout(r,180));
  let cx = h.x, cy = h.y;
  const steps = 30;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const e = 1 - Math.pow(1 - t, 2.3);
    cx = h.x + dx * e;
    cy = h.y + (i % 4 === 0 ? (Math.random() - 0.5) * 3 : 0);
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy });
    await new Promise(r=>setTimeout(r, 8 + Math.random()*22));
  }
  // 最后微调回正
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: h.x + dx, y: h.y });
  await new Promise(r=>setTimeout(r,250));
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: h.x + dx, y: h.y, button: 'left', clickCount: 1 });
  // 轮询验证结果
  for (let i = 0; i < 6; i++) {
    await new Promise(r=>setTimeout(r,1500));
    const t = await ev('document.body.innerText');
    if (t.includes('验证失败')) { console.log('RESULT: FAIL'); break; }
    if (!t.includes('请完成安全验证') || /秒|重新/.test(t)) { console.log('RESULT: PASS!'); break; }
    if (i === 5) console.log('RESULT: UNKNOWN —', t.slice(-150).replace(/\n+/g,'|'));
  }
  const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  require('fs').writeFileSync('slider-final.jpg', Buffer.from(s.data, 'base64'));
  process.exit(0);
})();
