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
  const code = process.argv[2];
  // 找验证码输入框
  console.log('inputs:', await ev(`[...document.querySelectorAll('input')].map((i,idx)=>idx+':'+i.type+'|ph='+(i.placeholder||'')).join(' | ')`));
  const r = await ev(`(function(){
    const inp=[...document.querySelectorAll('input')].find(i=>(i.placeholder||'').includes('验证码'));
    if(!inp) return 'no-input';
    const st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    st.call(inp,'${code}');
    inp.dispatchEvent(new Event('input',{bubbles:true}));
    inp.dispatchEvent(new Event('change',{bubbles:true}));
    return 'ok:'+inp.value;
  })()`);
  console.log('fill:', r);
  // 勾协议
  console.log('agree:', await ev(`(function(){const cb=[...document.querySelectorAll('input[type=checkbox]')].find(c=>!c.checked); if(cb){cb.click(); return 'checked'} return 'none-or-already'})()`));
  await new Promise(r=>setTimeout(r,1000));
  // 点登录/注册
  const btn = JSON.parse(await ev(`JSON.stringify((()=>{const b=[...document.querySelectorAll('button,div,a')].find(e=>/^登录 \/ 注册$|^登录$/.test(e.innerText?.trim())&&e.offsetWidth>60); if(!b)return null; const rc=b.getBoundingClientRect(); return {x:rc.x+rc.width/2,y:rc.y+rc.height/2}})())`));
  console.log('loginBtn:', btn);
  if (btn) {
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: btn.x, y: btn.y, button: 'left', clickCount: 1 });
  }
  await new Promise(rr => setTimeout(rr, 6000));
  console.log('URL:', await ev('location.href'));
  console.log('TXT:', (await ev('document.body.innerText.slice(0,300)')||'').replace(/\n+/g,' | '));
  console.log('COOKIES:', await ev('document.cookie.slice(0,200)'));
  const s2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  fs.writeFileSync('after-login.jpg', Buffer.from(s2.data, 'base64'));
  process.exit(0);
})();
