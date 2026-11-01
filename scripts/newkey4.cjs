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
  const r = await ev(`(function(){
    const dlg=[...document.querySelectorAll('div')].find(d=>d.querySelector(':scope>div')&&/新建API Key/.test(d.innerText)&&d.querySelector('input'));
    const inp=[...document.querySelectorAll('input')].find(i=>(i.placeholder||'').includes('API key'));
    if(!inp) return 'no-input:'+document.querySelectorAll('.el-dialog,.el-overlay').length;
    const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    st.call(inp,'pool1');
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    inp.dispatchEvent(new Event('change',{bubbles:true}));
    return 'ok:'+inp.value;
  })()`);
  console.log('fill:', r);
  await new Promise(r2=>setTimeout(r2,1000));
  // 确定按钮（弹窗内, innerText=确定）
  const r2 = await ev(`(function(){
    const btns=[...document.querySelectorAll('button')].filter(b=>b.innerText.trim()==='确定'&&b.offsetWidth>40&&b.offsetParent);
    if(!btns.length) return 'no-btn';
    btns[btns.length-1].click();
    return 'clicked:'+btns.length;
  })()`);
  console.log('confirm:', r2);
  await new Promise(r2=>setTimeout(r2,4000));
  const key = await ev(`document.body.innerText.match(/[0-9a-f]{32}\.[A-Za-z0-9]{16}/)?.[0]||document.body.innerText.match(/[0-9a-f]{32}\.[A-Za-z0-9]+/)?.[0]||'none'`);
  console.log('FULLKEY:', key);
  if (key !== 'none') fs.writeFileSync('apikey.txt', key);
  const s2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  fs.writeFileSync('dialog4.jpg', Buffer.from(s2.data, 'base64'));
  process.exit(0);
})();
