const WebSocket = require('ws');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('z.ai'));
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256*1024*1024 });
  let id = 0; const waiters = {};
  const send = (m, p = {}) => new Promise(res => { const i = ++id; waiters[i] = res; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && waiters[m.id]) { waiters[m.id](m.result); delete waiters[m.id]; return; }
    if (m.method === 'Network.responseReceived') {
      const u = m.params.response.url;
      if (/captcha|aliyuncs/i.test(u)) {
        console.log('<<', m.params.response.status, u.slice(0, 150));
      }
    }
  });
  await new Promise(r => ws.on('open', r));
  await send('Network.enable');
  await send('Page.enable');
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }))?.result?.value;
  // 页面里找 sceneId/prefix 配置
  console.log('CONFIG:', await ev(`(function(){var s=document.documentElement.innerHTML;var m1=s.match(/sceneId['":\s=]+([\w-]{5,20})/);var m2=s.match(/prefix['":\s=]+([\w-]{4,15})/);var m3=s.match(/region['":\s=]+['"]?(\w{2,5})/);return JSON.stringify({sceneId:m1&&m1[1],prefix:m2&&m2[2]||m2&&m2[1],region:m3&&m3[1]})})()`));
  // 重新触发滑块让它请求 InitCaptcha
  await ev(`(function(){var b=[...document.querySelectorAll('button,span,div')].find(function(e){return /^(发送验证码|重新发送)$/.test((e.innerText||'').trim())&&e.offsetWidth>30&&e.offsetWidth<200});if(b)b.click();return 'ok'})()`);
  await new Promise(r=>setTimeout(r,6000));
  process.exit(0);
})();
