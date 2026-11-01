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
  // 列出所有按钮
  console.log('BTNS:', await ev(`[...document.querySelectorAll('button,div[class*=btn],a.el-button,.el-button')].map((b,i)=>i+':'+(b.innerText||'').trim().slice(0,20)+'|'+b.offsetWidth+'x'+b.offsetHeight).filter(s=>s.split('|')[0].length>1).join(' | ')`));
  // 直接用 JS 点登录按钮
  const r = await ev(`(function(){
    const btns=[...document.querySelectorAll('button, .el-button, a')].filter(e=>/登录/.test(e.innerText||'')&&e.offsetWidth>60);
    if(!btns.length) return 'none';
    btns[0].click();
    return 'clicked:'+btns[0].innerText.trim().slice(0,20);
  })()`);
  console.log('click:', r);
  await new Promise(rr => setTimeout(rr, 6000));
  console.log('URL:', await ev('location.href'));
  console.log('TXT:', (await ev('document.body.innerText.slice(0,400)')||'').replace(/\n+/g,' | '));
  const s2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  fs.writeFileSync('after-login.jpg', Buffer.from(s2.data, 'base64'));
  process.exit(0);
})();
