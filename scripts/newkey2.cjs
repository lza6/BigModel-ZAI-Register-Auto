// 点击真正的"新建API Key"蓝色按钮 → 确认弹窗 → 抓一次性完整 key
const WebSocket = require('ws');
const fs = require('fs');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('bigmodel'));
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256*1024*1024 });
  let id = 0; const waiters = {}; const responses = [];
  const send = (m, p = {}) => new Promise(res => { const i = ++id; waiters[i] = res; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && waiters[m.id]) { waiters[m.id](m.result); delete waiters[m.id]; return; }
    if (m.method === 'Network.loadingFinished') {
      // 响应体可能包含 key
      responses.push(m.params.requestId);
    }
  });
  await new Promise(r => ws.on('open', r));
  await send('Network.enable');
  await send('Page.enable');
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;
  // 用坐标点"新建API Key"按钮（右上角, css ~ (1817,114)×(1386/2000)）
  const btn = JSON.parse(await ev(`JSON.stringify((()=>{const b=[...document.querySelectorAll('button')].find(e=>/新建/.test(e.innerText)&&e.offsetWidth>80); if(!b)return null; const r=b.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}})())`));
  console.log('btn:', btn);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
  await new Promise(r=>setTimeout(r,2500));
  // 弹窗截图
  const s1 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  fs.writeFileSync('dialog1.jpg', Buffer.from(s1.data, 'base64'));
  console.log('DLG TXT:', (await ev(`[...document.querySelectorAll('.el-dialog')].map(d=>d.innerText.slice(0,200)).join('||')`)||'').slice(0,400));
  // 点确定/创建
  await ev(`[...document.querySelectorAll('.el-dialog button, .el-overlay button')].find(b=>/确定|创建|生成|是/.test(b.innerText))?.click(); 'ok'`);
  await new Promise(r=>setTimeout(r,4000));
  // 找完整 key
  const key = await ev(`document.body.innerText.match(/[0-9a-f]{32}\.[A-Za-z0-9]{16}/)?.[0]||document.body.innerText.match(/[0-9a-f]{32}\.[A-Za-z0-9]+/)?.[0]||'none'`);
  console.log('FULLKEY:', key);
  if (key !== 'none') fs.writeFileSync('apikey.txt', key);
  const s2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  fs.writeFileSync('dialog2.jpg', Buffer.from(s2.data, 'base64'));
  process.exit(0);
})();
