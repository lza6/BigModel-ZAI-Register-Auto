// 半自动点选: 参数为 图内比例列表 "fx1,fy1 fx2,fy2 fx3,fy3"
const WebSocket = require('ws');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('bigmodel'));
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256*1024*1024 });
  let id = 0; const waiters = {};
  const send = (m, p = {}) => new Promise(res => { const i = ++id; waiters[i] = res; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.on('message', d => { const m = JSON.parse(d); if (m.id && waiters[m.id]) { waiters[m.id](m.result); delete waiters[m.id]; } });
  await new Promise(r => ws.on('open', r));
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;
  console.log('order:', await ev(`(()=>{const t=document.body.innerText; const m=t.match(/请依次点击[：:]\s*([^\n]{1,20})/); return m?m[1]:'no-captcha-visible'})()`));
  const r = JSON.parse(await ev(`JSON.stringify((()=>{const i=[...document.images].find(i=>i.width>250&&i.height>180); if(!i)return null; const b=i.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height}})())`));
  console.log('imgRect:', r);
  const pts = process.argv[2].split(' ').map(s=>s.split(',').map(Number));
  for (const [fx, fy] of pts) {
    const cssX = r.x + fx * r.w, cssY = r.y + fy * r.h;
    console.log('click', (cssX|0), (cssY|0));
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cssX, y: cssY });
    await new Promise(rr => setTimeout(rr, 120));
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cssX, y: cssY, button: 'left', clickCount: 1 });
    await new Promise(rr => setTimeout(rr, 60));
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cssX, y: cssY, button: 'left', clickCount: 1 });
    await new Promise(rr => setTimeout(rr, 600));
  }
  // 确定
  const btn = JSON.parse(await ev(`JSON.stringify((()=>{const b=[...document.querySelectorAll('button,div,a')].find(e=>e.innerText?.trim()==='确定'&&e.offsetWidth>80&&e.offsetHeight>20); if(!b)return null; const rc=b.getBoundingClientRect(); return {x:rc.x+rc.width/2,y:rc.y+rc.height/2}})())`));
  console.log('confirm:', btn);
  if (btn) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
  }
  await new Promise(rr => setTimeout(rr, 4000));
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  require('fs').writeFileSync('solved.jpg', Buffer.from(shot.data, 'base64'));
  console.log('TXT:', (await ev('document.body.innerText.slice(0,400)')||'').replace(/\n+/g,' | '));
  process.exit(0);
})();
