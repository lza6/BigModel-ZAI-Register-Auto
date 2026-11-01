// 路由守卫分析: 直接调 router 看当前 route & 阻塞点; 看 wd-paas-front 微前端的子应用加载
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
  console.log('route:', await ev(`window.__VUE__?.root?.__vue__?.$route?.fullPath || (document.getElementById('app').__vue_app__ ? 'vue3?' : document.getElementById('app').__vue__?.$route?.fullPath) || 'unknown'`));
  console.log('router:', await ev(`document.getElementById('app').__vue__?.$router?.currentRoute?.fullPath`));
  // 微前端: qiankun 的 __POWERED_BY__ 状态
  console.log('qiankun:', await ev(`typeof __INJECTED_PUBLIC_PATH_BY_QIANKUN__ + '|' + (window.__POWERED_BY_QIANKUN__??'false')`));
  console.log('microApps:', await ev(`window.__MICRO_APP_ENVIRONMENT__ || window.microApp || 'none'`));
  // 白屏 dialog: name=onboarding 的弹窗关掉再强制路由
  console.log('dialogs:', await ev(`[...document.querySelectorAll('.el-dialog__wrapper')].map(d=>d.getAttribute('name')+'='+(d.style.display||'visible')).join(',')`));
  // 强制跳登录页
  await ev(`document.getElementById('app').__vue__.$router.push('/login').catch(()=>{}); 'pushed'`);
  await new Promise(r=>setTimeout(r, 5000));
  console.log('after push URL:', await ev('location.href'));
  console.log('after len:', await ev('document.body.innerText.length'));
  console.log('after TXT:', (await ev('document.body.innerText.slice(0,300)')||'').replace(/\n+/g,' | '));
  process.exit(0);
})();
