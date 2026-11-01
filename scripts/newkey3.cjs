// 弹窗已开: 填名称 → 确定 → 抓完整key
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
  // 填名称
  const r = await ev(`(function(){
    const dlg=[...document.querySelectorAll('.el-dialog')].find(d=>d.innerText.includes('新建API Key'));
    if(!dlg) return 'no-dialog';
    const inp=dlg.querySelector('input');
    if(!inp) return 'no-input';
    const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    st.call(inp,'pool1');
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    return 'ok';
  })()`);
  console.log('fill:', r);
  await new Promise(r2=>setTimeout(r2,800));
  // 点确定
  await ev(`[...document.querySelectorAll('.el-dialog button')].find(b=>b.innerText.trim()==='确定')?.click(); 'ok'`);
  await new Promise(r2=>setTimeout(r2,4000));
  const key = await ev(`document.body.innerText.match(/[0-9a-f]{32}\.[A-Za-z0-9]{16}/)?.[0]||document.body.innerText.match(/[0-9a-f]{32}\.[A-Za-z0-9]+/)?.[0]||'none'`);
  console.log('FULLKEY:', key);
  if (key !== 'none') fs.writeFileSync('apikey.txt', key);
  const s2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  fs.writeFileSync('dialog3.jpg', Buffer.from(s2.data, 'base64'));
  process.exit(0);
})();
