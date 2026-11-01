const WebSocket = require('ws');
const fs = require('fs');
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
  // 布岔按: 布=#1(0.673,0.730) 岔=#2(0.823,0.741) 按=#0(0.368,0.322)
  const plan = [[0.673,0.730],[0.823,0.741],[0.368,0.322]];
  for (const [fx, fy] of plan) {
    const cssX = rect.x + fx * rect.w, cssY = rect.y + fy * rect.h;
    console.log('click', (cssX|0), (cssY|0));
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cssX, y: cssY });
    await new Promise(rr => setTimeout(rr, 100));
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cssX, y: cssY, button: 'left', clickCount: 1 });
    await new Promise(rr => setTimeout(rr, 50));
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cssX, y: cssY, button: 'left', clickCount: 1 });
    await new Promise(rr => setTimeout(rr, 600));
  }
  const btn = JSON.parse(await ev(`JSON.stringify((()=>{const b=[...document.querySelectorAll('button,div,a')].find(e=>e.innerText?.trim()==='确定'&&e.offsetWidth>80); if(!b)return null; const rc=b.getBoundingClientRect(); return {x:rc.x+rc.width/2,y:rc.y+rc.height/2}})())`));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
  console.log('confirmed');
  await new Promise(rr => setTimeout(rr, 5000));
  const t2 = await ev('document.body.innerText.slice(0,300)');
  console.log('TXT:', (t2||'').replace(/\n+/g,' | '));
  const s2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  fs.writeFileSync('result2.jpg', Buffer.from(s2.data, 'base64'));
  process.exit(0);
})();
