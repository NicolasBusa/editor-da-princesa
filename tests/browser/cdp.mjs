import { writeFile } from 'node:fs/promises';

export async function connect() {
  const tabs = await (await fetch('http://127.0.0.1:9335/json/list')).json();
  const tab = tabs.find((tab) => tab.type === 'page');
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once:true }); socket.addEventListener('error', reject, { once:true }); });
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.id && pending.has(message.id)) { const p = pending.get(message.id); pending.delete(message.id); clearTimeout(p.timer); message.error ? p.reject(message.error) : p.resolve(message.result); }
  });
  function send(method, params = {}) {
    return new Promise((resolve,reject) => { const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); },120000); pending.set(id,{resolve,reject,timer}); socket.send(JSON.stringify({id,method,params})); });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function screenshot(path, fullPage = false) {
    const metrics = await send('Page.getLayoutMetrics');
    const opts = {format:'png',captureBeyondViewport:fullPage};
    if (fullPage) opts.clip = {x:0,y:0,width:metrics.cssContentSize.width,height:metrics.cssContentSize.height,scale:1};
    const image = await send('Page.captureScreenshot',opts);
    await writeFile(path,Buffer.from(image.data,'base64'));
  }
  await send('Runtime.enable'); await send('Page.enable');
  return {send,evaluate,screenshot,errors,close:()=>socket.close()};
}
export const delay = (ms) => new Promise(resolve=>setTimeout(resolve,ms));
