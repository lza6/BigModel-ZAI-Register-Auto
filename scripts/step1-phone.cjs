const { connect } = require('./lib.cjs');
(async () => {
  const { send, ev } = await connect();
  const phone = process.argv[2];
  // 详查手机号输入框结构
  console.log('INPUTS:', await ev(`[...document.querySelectorAll('input')].map((i,idx)=>idx+':'+i.type+'|ph='+(i.placeholder||'')+'|cls='+i.className.slice(0,40)).join(' \n ')`));
  // 用原生 setter + composition 事件填
  const r = await ev(`(function(){
    const inp = [...document.querySelectorAll('input')].find(i=>/phone|mobile|tel/i.test(i.type+i.name+i.placeholder+i.className)) || document.querySelectorAll('input')[0];
    if(!inp) return 'no-input';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
    setter.call(inp, '${phone}');
    inp.dispatchEvent(new Event('input', {bubbles:true}));
    inp.dispatchEvent(new Event('change', {bubbles:true}));
    inp.focus();
    return 'ok:'+inp.value;
  })()`);
  console.log('fill:', r);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
  require('fs').writeFileSync('s1.jpg', Buffer.from(shot.data, 'base64'));
  process.exit(0);
})();
