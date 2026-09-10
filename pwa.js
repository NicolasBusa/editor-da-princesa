const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isiPhoneFamily = /iphone|ipad|ipod/i.test(navigator.userAgent);
const dismissedKey = 'princess-pwa-dismissed-at';
let installEvent = null;
let refreshing = false;

function installMarkup() {
  if (standalone || !document.querySelector('.site-header')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <aside class="pwa-install-card" id="pwa-install-card" aria-label="Instalar Editor da Princesa" hidden>
      <img src="/assets/pwa/icon-192.png" alt="" width="58" height="58">
      <div><strong>Leve seu editor com você</strong><span>Instale na tela inicial do iPhone.</span></div>
      <button class="pwa-install-primary" id="pwa-install-primary">Instalar</button>
      <button class="pwa-install-close" id="pwa-install-close" aria-label="Fechar sugestão de instalação">×</button>
    </aside>
    <dialog class="pwa-guide" id="pwa-guide" aria-labelledby="pwa-guide-title">
      <button class="pwa-guide-close" type="button" aria-label="Fechar">×</button>
      <img src="/assets/pwa/icon-192.png" alt="Logo do Editor da Princesa" width="88" height="88">
      <p class="pwa-guide-eyebrow">SEU EDITOR COMO APLICATIVO</p>
      <h2 id="pwa-guide-title">Leve este cantinho<br><em>para a tela inicial.</em></h2>
      <ol>
        <li><span>1</span><div>Abra o menu <strong>Compartilhar</strong> do navegador.</div></li>
        <li><span>2</span><div>Toque em <strong>Adicionar à Tela de Início</strong>.</div></li>
        <li><span>3</span><div>Ative <strong>Abrir como App</strong> e toque em Adicionar.</div></li>
      </ol>
      <button class="pwa-guide-done" type="button">Entendi ♡</button>
    </dialog>
  `);
  const footer = document.querySelector('.site-footer');
  if (footer) footer.insertAdjacentHTML('beforeend', '<button class="pwa-footer-button" type="button">Instalar aplicativo</button>');

  const card = document.querySelector('#pwa-install-card');
  const guide = document.querySelector('#pwa-guide');
  const showGuide = () => guide.showModal();
  const beginInstall = async () => {
    if (!installEvent) return showGuide();
    installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') card.hidden = true;
    installEvent = null;
  };
  document.querySelector('#pwa-install-primary').addEventListener('click', beginInstall);
  document.querySelector('.pwa-footer-button')?.addEventListener('click', beginInstall);
  document.querySelector('#pwa-install-close').addEventListener('click', () => {
    card.hidden = true;
    localStorage.setItem(dismissedKey, String(Date.now()));
  });
  guide.querySelector('.pwa-guide-close').addEventListener('click', () => guide.close());
  guide.querySelector('.pwa-guide-done').addEventListener('click', () => guide.close());
  guide.addEventListener('click', event => { if (event.target === guide) guide.close(); });

  const dismissedAt = Number(localStorage.getItem(dismissedKey) || 0);
  if (isiPhoneFamily && Date.now() - dismissedAt > 14 * 864e5) setTimeout(() => { card.hidden = false; }, 900);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installEvent = event;
    if (Date.now() - dismissedAt > 14 * 864e5) card.hidden = false;
  });
  window.addEventListener('appinstalled', () => { card.hidden = true; guide.close(); });
}

function showUpdate(registration) {
  if (!registration.waiting || document.querySelector('#pwa-update-card')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <aside class="pwa-update-card" id="pwa-update-card" role="status">
      <span aria-hidden="true">✧</span>
      <div><strong>Tem novidade no seu cantinho</strong><small>Atualize quando estiver pronta.</small></div>
      <button type="button">Atualizar</button>
    </aside>
  `);
  document.querySelector('#pwa-update-card button').addEventListener('click', () => {
    refreshing = true;
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  });
}

async function registerWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    if (navigator.serviceWorker.controller) showUpdate(registration);
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(registration);
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) location.reload();
    });
    setTimeout(() => registration.update().catch(() => {}), 2500);
  } catch {
    // O editor continua funcionando normalmente quando o navegador bloqueia PWAs.
  }
}

if (standalone) document.documentElement.classList.add('is-standalone');
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installMarkup, { once: true });
else installMarkup();
registerWorker();
