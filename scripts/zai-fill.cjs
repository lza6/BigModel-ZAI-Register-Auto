const WebSocket = require('ws');
const fs = require('fs');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('z.ai'));
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256*1024*1024 });
  let id = 0; const waiters = {};
  const send = (m, p = {}) => new Promise(res => { const i = ++id; waiters[i] = res; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.on('message', d => { const m = JSON.parse(d); if (m.id && waiters[m.id]) { waiters[m.id](m.result); delete waiters[m.id]; } });
  await new Promise(r => ws.on('open', r));
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;
  const phone = process.argv[2];
  const r = await ev(`(function(){
    const inp=[...document.querySelectorAll('input')].find(i=>i.type==='tel');
    if(!inp) return 'no-input';
    const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    st.call(inp,'${phone}');
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    return 'ok:'+inp.value;
  })()`);
  console.log('fill:', r);
  await new Promise(r2=>setTimeout(r2,800));
  // 点发送验证码
  const r2 = await ev(`(function(){
    const b=[...document.querySelectorAll('button')].find(e=>/发送验证码|获取验证码/.test(e.innerText));
    if(!b) return 'no-btn';
    b.click(); return 'clicked';
  })()`);
  console.log('sendCode:', r2);
  await new Promise(r2=>setTimeout(r2,3000));
  console.log('TXT:', (await ev('document.body.innerText.slice(0,300)')||'').replace(/\n+/g,' | '));
  // 抓发送验证码的请求
  process.exit(0);
})();
