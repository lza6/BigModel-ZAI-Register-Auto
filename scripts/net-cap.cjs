// 监听真实页面请求, 抓它自带 Authorization 头
const WebSocket = require('ws');
(async () => {
  const list = await (await fetch('http://127.0.0.1:9222/json')).json();
  const page = list.find(t => t.type === 'page' && t.url.includes('bigmodel'));
  const ws = new WebSocket(page.webSocketDebuggerUrl, { maxPayload: 256*1024*1024 });
  let id = 0; const waiters = {};
  const send = (m, p = {}) => new Promise(res => { const i = ++id; waiters[i] = res; ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && waiters[m.id]) { waiters[m.id](m.result); delete waiters[m.id]; return; }
    if (m.method === 'Network.requestWillBeSent' && /\/api\/biz\//.test(m.params.request.url)) {
      const h = m.params.request.headers;
      const auth = h['Authorization'] || h['authorization'] || '';
      console.log('AUTH:', auth.slice(0, 100), 'URL:', m.params.request.url.slice(-50));
      if (auth) require('fs').writeFileSync('auth-token.txt', auth);
    }
  });
  await new Promise(r => ws.on('open', r));
  await send('Network.enable', { maxPostDataSize: 1<<16 });
  await send('Page.enable');
  await send('Page.navigate', { url: 'https://bigmodel.cn/apikey/platform' });
  await new Promise(r => setTimeout(r, 12000));
  process.exit(0);
})();
