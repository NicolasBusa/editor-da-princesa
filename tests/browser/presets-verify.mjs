import { connect, delay } from './cdp.mjs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const b = await connect(), run = code => b.evaluate(code), origin = 'http://127.0.0.1:4173';
const ids = [];
async function until(expression) { for (let i = 0; i < 250; i++) { if (await run(expression)) return; await delay(100); } throw new Error(`Timeout: ${expression}`); }
async function click(selector) { await run(`document.querySelector(${JSON.stringify(selector)}).click()`); }
async function settle() { await until(`document.querySelector('#artboard-loading')?.hidden && document.querySelector('#render-status')?.hidden`); }
async function set(selector, value) { await run(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}); e.value=${JSON.stringify(value)}; e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`); await settle(); }
const hash = () => run(`(()=>{const c=document.querySelector('#photo-canvas');let h=0;for(const v of c.getContext('2d').getImageData(0,0,c.width,c.height).data)h=Math.imul(h^v,16777619);return h>>>0})()`);
try {
  await b.send('Network.clearBrowserCookies');
  await b.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true });
  await b.send('Page.navigate', { url: origin }); await until(`Boolean(document.querySelector('#login-form'))`);
  assert.equal(await run('document.documentElement.scrollWidth<=innerWidth'), true);
  await delay(600); await b.screenshot(fileURLToPath(new URL('./presets-login.png', import.meta.url)));
  await run(`document.querySelector('#password').value='wrong';document.querySelector('#login-form').requestSubmit()`);
  await until(`document.querySelector('#login-error').textContent.includes('senha')`);
  await run(`document.querySelector('#password').value='1309';document.querySelector('#login-form').requestSubmit()`);
  await until(`Boolean(document.querySelector('#preset-save'))`); await settle();
  await until(`document.querySelector('#preset-storage').textContent.includes('Supabase')`);
  console.log('PASS mobile gate, wrong password, login and Supabase storage status');
  await click('[data-camera="dream120"]'); await set('#intensity', '68'); await set('#camera-texture', '32');
  await click('#tab-adjust'); await set('#control-adjustments-light-exposure', '.75');
  await click('#tab-cameras'); await settle(); const desired = await hash();
  await click('#preset-save'); await run(`document.querySelector('#preset-name').value='Teste navegador nuvem';document.querySelector('#preset-form').requestSubmit()`);
  await until(`!document.querySelector('#preset-form').closest('dialog').open && document.querySelectorAll('.preset-card').length>0`);
  const first = await run(`Array.from(document.querySelectorAll('.preset-card')).find(e=>e.textContent.includes('Teste navegador nuvem')).dataset.presetId`); ids.push(first);
  await click('[data-camera="flash800"]'); await set('#intensity', '95');
  const before = await hash(); assert.notEqual(before, desired);
  await click(`[data-preset-id="${first}"] .preset-apply`); await settle(); assert.equal(await hash(), desired);
  await click('#undo-button'); await settle(); assert.equal(await hash(), before);
  await click('#redo-button'); await settle(); assert.equal(await hash(), desired);
  console.log('PASS preset reproduces pixels in one click; undo and redo restore exact render');
  await click('#preset-save'); await run(`document.querySelector('#preset-name').value='Teste navegador sol';document.querySelector('#preset-crop').checked=true;document.querySelector('#preset-form').requestSubmit()`);
  await until(`!document.querySelector('#preset-form').closest('dialog').open && Array.from(document.querySelectorAll('.preset-card')).some(e=>e.textContent.includes('Teste navegador sol'))`);
  const second = await run(`Array.from(document.querySelectorAll('.preset-card')).find(e=>e.textContent.includes('Teste navegador sol')).dataset.presetId`); ids.push(second);
  await click(`[data-preset-id="${first}"] .preset-small-button`); await run(`document.querySelector('#preset-name').value='Nuvem renomeada';document.querySelector('#preset-form').requestSubmit()`);
  await until(`!document.querySelector('#preset-form').closest('dialog').open && document.querySelector('[data-preset-id="${first}"]').textContent.includes('Nuvem renomeada')`);
  await set('#intensity', '44');
  await click(`[data-preset-id="${first}"] .preset-small-button:nth-child(2)`); await run(`document.querySelector('#preset-form').requestSubmit()`); await until(`!document.querySelector('#preset-form').closest('dialog').open`);
  await set('#intensity', '12'); await click(`[data-preset-id="${first}"] .preset-apply`); await settle(); assert.equal(await run(`document.querySelector('#intensity').value`), '44');
  for (const width of [320, 375, 393, 430, 768, 1360]) { await b.send('Emulation.setDeviceMetricsOverride', { width, height:852, deviceScaleFactor:1, mobile:width<700 }); await delay(150); assert.equal(await run('document.documentElement.scrollWidth<=innerWidth'), true, `overflow ${width}`); }
  await b.send('Emulation.setDeviceMetricsOverride', { width:393,height:852,deviceScaleFactor:1,mobile:true });
  await click('#preset-save'); await b.screenshot(fileURLToPath(new URL('./presets-save.png',import.meta.url))); await click('#preset-cancel');
  await b.screenshot(fileURLToPath(new URL('./presets-mobile.png',import.meta.url)),true);
  await b.send('Page.reload'); await until(`document.querySelectorAll('.preset-card').length>=2`); await settle();
  assert.equal(await run(`document.querySelector('[data-preset-id="${first}"]').textContent.includes('Nuvem renomeada')`), true);
  console.log('PASS multiple presets, rename, update, persistence and six responsive widths');
  await run(`fetch('/api/logout',{method:'POST'})`);
  await click('#preset-save'); await run(`document.querySelector('#preset-name').value='Sessão recuperada';document.querySelector('#preset-form').requestSubmit()`);
  await until(`document.querySelector('#session-password').closest('dialog').open`);
  await run(`document.querySelector('#session-password').value='1309';document.querySelector('#session-password').form.requestSubmit()`);
  await until(`!document.querySelector('#preset-form').closest('dialog').open && Array.from(document.querySelectorAll('.preset-card')).some(e=>e.textContent.includes('Sessão recuperada'))`);
  ids.push(await run(`Array.from(document.querySelectorAll('.preset-card')).find(e=>e.textContent.includes('Sessão recuperada')).dataset.presetId`));
  await click(`[data-preset-id="${second}"] .preset-small-button:nth-child(3)`); await run(`document.querySelector('#preset-form').requestSubmit()`); await until(`!document.querySelector('[data-preset-id="${second}"]')`);
  console.log('PASS expired session recovers without losing the photo; delete works');
  assert.deepEqual(b.errors, []); console.log('PASS no uncaught browser errors');
} finally {
  for (const id of ids) await run(`fetch('/api/presets/${id}',{method:'DELETE'})`).catch(()=>{});
  b.close();
}
