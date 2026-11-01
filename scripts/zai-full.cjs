// z.ai 完整流程: 填号→hook→发码→滑块token→登录
const WebSocket = require('ws');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('z.ai'));
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256*1024*1024 });
  let id = 0; const waiters = {};
  const send = (m, p) => new Promise(res => { const i = ++id; waiters[i] = res; ws.send(JSON.stringify({ id: i, method: m, params: p || {} })); });
  let out = [];
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && waiters[m.id]) { waiters[m.id](m.result); delete waiters[m.id]; return; }
    if (m.method === 'Runtime.consoleAPICalled') {
      const args = m.params.args.map(a => a.value ?? a.description ?? '').join(' ');
      if (!/Meta Pixel|Object$|Iterator/.test(args)) out.push(args);
    }
  });
  await new Promise(r => ws.on('open', r));
  await send('Runtime.enable');
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;
  // hook
  await ev(`(function(){window.__reqs=[];if(!window.__hooked){window.__hooked=true;var of=window.fetch;window.fetch=function(){window.__reqs.push('F:'+((arguments[0]&&arguments[0].url)||arguments[0])+(arguments[1]&&arguments[1].body?' B:'+JSON.stringify(arguments[1].body).slice(0,200):''));return of.apply(this,arguments)};var oo=XMLHttpRequest.prototype.open;var os=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(m,u){this.__u=u;return oo.apply(this,arguments)};XMLHttpRequest.prototype.send=function(b){window.__reqs.push('X:'+this.__u+' B:'+(b||'').toString().slice(0,200));return os.apply(this,arguments)}}return 'ok'})()`);
  // 填手机号
  const phone = process.argv[2] || '17719806837';
  console.log('fill:', await ev(`(function(){var i=[...document.querySelectorAll('input')].find(function(x){return x.type==='tel'});if(!i)return 'no';var st=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;st.call(i,'${phone}');i.dispatchEvent(new Event('input',{bubbles:true}));return i.value})()`));
  await new Promise(r=>setTimeout(r,600));
  // 点发送
  console.log('send:', await ev(`(function(){var b=[...document.querySelectorAll('button,span,div')].find(function(e){return /^发送验证码$/.test((e.innerText||'').trim())&&e.offsetWidth>30});if(!b)return 'nobtn';b.click();return 'clicked'})()`));
  await new Promise(r=>setTimeout(r,8000));
  const reqs = await ev('JSON.stringify(window.__reqs)');
  console.log('REQS:', (reqs||'[]').slice(0, 1500));
  console.log('STATE:', (await ev('document.body.innerText.slice(-250)')||'').replace(/\n+/g,' | '));
  process.exit(0);
})();
