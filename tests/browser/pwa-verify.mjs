import { connect, delay } from './cdp.mjs';
import { fileURLToPath } from 'node:url';

const browser = await connect();
const run = expression => browser.evaluate(expression);
const check = (name, passed) => {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) throw new Error(name);
};

try {
  await browser.send('Network.enable');
  await browser.send('Network.setUserAgentOverride', {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  });
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 3, mobile: true });
  await browser.send('Page.navigate', { url: 'http://127.0.0.1:4173/login.html' });
  await delay(600);
  await run(`fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'1309'})})`);
  await browser.send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await delay(1800);

  check('Manifest and Apple icon are linked', await run(`document.querySelector('link[rel="manifest"]')?.href.endsWith('/manifest.webmanifest')&&document.querySelector('link[rel="apple-touch-icon"]')?.href.endsWith('/assets/pwa/apple-touch-icon.png')`));
  check('Install suggestion is visible on iPhone', await run(`!document.querySelector('#pwa-install-card')?.hidden`));
  check('Persistent install entry exists in the footer', await run(`document.querySelector('.pwa-footer-button')?.textContent==='Instalar aplicativo'`));
  await run(`document.querySelector('#pwa-guide').showModal()`);
  check('iPhone installation guide opens', await run(`document.querySelector('#pwa-guide')?.open&&document.querySelector('#pwa-guide').textContent.includes('Adicionar à Tela de Início')`));
  await browser.screenshot(fileURLToPath(new URL('./pwa-install-mobile.png', import.meta.url)), true);
  await run(`document.querySelector('#pwa-guide').close()`);

  check('Service worker activates at the root scope', await run(`Promise.race([navigator.serviceWorker.ready.then(r=>r.scope==='http://127.0.0.1:4173/'),new Promise(resolve=>setTimeout(()=>resolve(false),5000))])`));
  for (let i = 0; i < 30 && !(await run(`Boolean(navigator.serviceWorker.controller)`)); i++) await delay(100);
  check('Current page is controlled by the service worker', await run(`Boolean(navigator.serviceWorker.controller)`));

  await browser.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await browser.send('Page.reload');
  await delay(700);
  check('Offline navigation shows the friendly fallback', await run(`document.title.startsWith('Sem conexão')&&document.body.textContent.toLowerCase().includes('uma nuvem passou por aqui')`));
  await browser.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  check('No uncaught browser errors', browser.errors.length === 0);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {});
  browser.close();
}
