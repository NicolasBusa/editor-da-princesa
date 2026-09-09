import { connect, delay } from './cdp.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const browser = await connect();
const run = expression => browser.evaluate(expression);
async function until(expression) {
  for (let attempt = 0; attempt < 300; attempt++) {
    if (await run(expression)) return;
    await delay(100);
  }
  throw new Error(`Timeout: ${expression}`);
}
try {
  await browser.send('Network.clearBrowserCookies');
  await browser.send('Page.navigate', { url: 'http://127.0.0.1:4173/login.html' });
  await until(`Boolean(document.querySelector('#login-form'))`);
  await run(`fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'1309'})})`);
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true });
  await browser.send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await until(`document.querySelector('#artboard-loading')?.hidden`);
  await run(`document.querySelector('#tab-stickers').click()`);

  for (const [category, count] of [['animais', 20], ['entretenimento', 15], ['musica', 16]]) {
    await run(`document.querySelector('[data-category="${category}"]').click()`);
    assert.equal(await run(`document.querySelectorAll('#sticker-grid .sticker-card').length`), count);
    const decoded = await run(`Promise.all([...document.querySelectorAll('#sticker-grid img')].map(async image=>{try{await image.decode();return image.naturalWidth>0&&image.naturalHeight>0}catch{return false}}))`);
    assert.equal(decoded.every(Boolean), true, `${category}: todas as imagens decodificam`);
    console.log(`PASS ${category}: ${count} adesivos carregados`);
  }

  await run(`document.querySelector('[data-category="entretenimento"]').click()`);
  const sourceAspect = await run(`(async()=>{const image=document.querySelector('[data-sticker-id="custom-entertainment-6"] img');await image.decode();return image.naturalWidth/image.naturalHeight})()`);
  await run(`document.querySelector('[data-sticker-id="custom-entertainment-6"]').click()`);
  await until(`Boolean(document.querySelector('.sticker-object'))`);
  const overlayAspect = await run(`(()=>{const box=document.querySelector('.sticker-object').getBoundingClientRect();return box.width/box.height})()`);
  assert(Math.abs(sourceAspect - overlayAspect) < 0.02, `${sourceAspect} versus ${overlayAspect}`);
  assert.equal(await run(`document.querySelector('#undo-button').disabled`), false);
  console.log('PASS proporção original preservada e inclusão participa do histórico');

  assert.equal(await run(`document.documentElement.scrollWidth <= innerWidth`), true);
  await browser.screenshot(fileURLToPath(new URL('./stickers-categories-mobile.png', import.meta.url)), true);
  assert.deepEqual(browser.errors, []);
  console.log('PASS layout mobile e navegador sem erros');
} finally {
  browser.close();
}
