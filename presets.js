import { capturePreset, applyPreset, presetName } from './preset-model.js';

export function mountPresets(api) {
  const section = document.createElement('section'); section.className = 'preset-section';
  section.innerHTML = `<div class="preset-heading"><div><p class="eyebrow">DO SEU JEITINHO</p><h3>Meus presets <span aria-hidden="true">♡</span></h3></div><button class="secondary-button" id="preset-save">＋ Salvar</button></div><p class="preset-description">Guarde uma combinação e revele outra foto com um toque.</p><details id="preset-library" open><summary>Minha coleção <span id="preset-count"></span></summary><p id="preset-storage" class="preset-storage"></p><div id="preset-list" class="preset-list"></div><p id="preset-error" role="alert"></p><button class="text-reset" id="preset-retry">Atualizar coleção</button></details>`;
  document.querySelector('#panel-cameras').prepend(section);
  const dialog = document.createElement('dialog'); dialog.className = 'sweet-dialog preset-dialog'; dialog.setAttribute('aria-labelledby', 'preset-title');
  dialog.innerHTML = `<form id="preset-form"><p class="eyebrow">UM VISUAL PARA VOLTAR</p><h2 id="preset-title">Guardar meu <em>preset.</em></h2><label for="preset-name">Nome da combinação</label><input id="preset-name" name="name" required maxlength="60" placeholder="Meu fim de tarde" autocomplete="off"><label class="preset-check"><input id="preset-crop" type="checkbox"> Incluir recorte, rotação e espelhamento</label><p id="preset-explanation">Câmera, luz, cores, efeitos e moldura. Sua foto, adesivos e legenda ficam só nesta edição.</p><p id="preset-form-error" role="alert"></p><div class="preset-actions"><button type="button" class="secondary-button" id="preset-cancel">Cancelar</button><button type="submit" class="primary-button" id="preset-confirm">Salvar preset</button></div></form>`;
  document.body.append(dialog);
  const auth = document.createElement('dialog'); auth.className = 'sweet-dialog preset-dialog'; auth.setAttribute('aria-labelledby', 'session-title');
  auth.innerHTML = `<form><p class="eyebrow">SEU CANTINHO CONTINUA AQUI</p><h2 id="session-title">Entre <em>novamente.</em></h2><p>Sua sessão terminou. A foto e os ajustes continuam abertos.</p><label for="session-password">Senha de entrada</label><input id="session-password" name="password" type="password" inputmode="numeric" autocomplete="current-password" required maxlength="128"><p role="alert" id="session-error"></p><div class="preset-actions"><button type="button" class="secondary-button" id="session-cancel">Cancelar</button><button class="primary-button" type="submit">Entrar</button></div></form>`;
  document.body.append(auth);
  const $ = id => document.getElementById(id);
  let rows = [], editing = null, operation = 'create', snapshot, pendingAuth, loading = false, busy = false;
  async function loginAgain() {
    if (pendingAuth) return pendingAuth;
    pendingAuth = new Promise((resolve, reject) => {
      auth.querySelector('form').reset(); $('session-error').textContent = ''; auth.showModal();
      auth.onclose = () => { pendingAuth = null; auth.returnValue === 'ok' ? resolve() : reject(new Error('Entre novamente para salvar na coleção.')); };
    });
    return pendingAuth;
  }
  $('session-cancel').onclick = () => auth.close('cancel');
  auth.querySelector('form').onsubmit = async event => {
    event.preventDefault(); const button = auth.querySelector('[type=submit]'); button.disabled = true;
    try { await request('/api/login', { method: 'POST', body: { password: $('session-password').value } }, false); auth.close('ok'); }
    catch (e) { $('session-error').textContent = e.message; } finally { button.disabled = false; }
  };
  async function request(url, options = {}, retry = true) {
    let response;
    try { response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json' }, body: options.body ? JSON.stringify(options.body) : undefined }); }
    catch { throw new Error('Sem conexão. Seus ajustes continuam aqui; tente novamente.'); }
    if (response.status === 401 && retry) { await loginAgain(); return request(url, options, false); }
    const result = await response.json(); if (!response.ok) throw Object.assign(new Error(result.error || 'Não foi possível concluir.'), { status: response.status }); return result;
  }
  function button(text, label, action, className = 'preset-small-button') {
    const el = document.createElement('button'); el.type = 'button'; el.className = className; el.textContent = text; el.setAttribute('aria-label', label); el.onclick = action; return el;
  }
  function render() {
    $('preset-count').textContent = rows.length ? `(${rows.length})` : '';
    const list = $('preset-list'); list.replaceChildren();
    if (!rows.length) { const empty = document.createElement('p'); empty.className = 'preset-empty'; empty.textContent = 'Sua coleção começa com um olhar. Ajuste a foto e toque em “Salvar”.'; list.append(empty); }
    for (const row of rows) {
      const card = document.createElement('div'); card.className = 'preset-card'; card.dataset.presetId = row.id;
      const apply = button('', `Aplicar ${row.name}`, () => {
        try { api.commit(); api.cancelCrop(); api.select(null); api.change(() => applyPreset(api.getState(), row.recipe), { reveal: true }); api.toast(`“${row.name}” aplicado. Você pode desfazer.`); }
        catch (e) { api.toast(e.message, true); }
      }, 'preset-apply');
      const title = document.createElement('strong'); title.textContent = row.name;
      const meta = document.createElement('span'); meta.textContent = `${row.recipe.camera.toUpperCase()}${row.recipe.composition ? ' · com recorte' : ''} · toque para aplicar`;
      apply.append(title, meta);
      const actions = document.createElement('div'); actions.className = 'preset-card-actions';
      actions.append(button('Renomear', `Renomear ${row.name}`, () => open('rename', row)), button('Atualizar', `Substituir configurações de ${row.name}`, () => open('update', row)), button('Excluir', `Excluir ${row.name}`, () => open('delete', row)));
      card.append(apply, actions); list.append(card);
    }
  }
  async function refresh() {
    if (loading) return; loading = true; $('preset-error').textContent = ''; $('preset-retry').disabled = true; $('preset-storage').textContent = 'Abrindo sua coleção…';
    try {
      const result = await request('/api/presets'); rows = result.presets;
      $('preset-storage').textContent = result.storage === 'supabase' ? '☁ Salvos no Supabase · coleção compartilhada' : 'Neste computador · Supabase não conectado'; render();
    } catch (e) { $('preset-storage').textContent = 'Coleção indisponível'; $('preset-error').textContent = e.message; }
    finally { loading = false; $('preset-retry').disabled = false; }
  }
  function open(mode, row = null) {
    operation = mode; editing = row; snapshot = capturePreset(api.getState(), true);
    $('preset-name').value = row?.name || ''; $('preset-name').disabled = mode === 'delete';
    $('preset-crop').checked = Boolean(row?.recipe.composition); $('preset-crop').closest('label').hidden = ['rename', 'delete'].includes(mode);
    $('preset-title').textContent = ({ create: 'Guardar meu preset.', rename: 'Um novo nome.', update: 'Atualizar esse visual?', delete: 'Excluir este preset?' })[mode];
    $('preset-confirm').textContent = ({ create: 'Salvar preset', rename: 'Salvar nome', update: 'Substituir configurações', delete: 'Excluir preset' })[mode];
    $('preset-explanation').textContent = mode === 'delete' ? 'Ele será removido da coleção compartilhada. A foto aberta permanece igual.' : mode === 'update' ? 'As configurações atuais substituirão o visual salvo neste preset.' : mode === 'rename' ? 'O visual salvo continua igual.' : 'Câmera, luz, cores, efeitos e moldura. Sua foto, adesivos e legenda ficam só nesta edição.';
    $('preset-form-error').textContent = ''; dialog.showModal(); if (mode !== 'delete') $('preset-name').focus();
  }
  $('preset-save').onclick = () => open('create'); $('preset-cancel').onclick = () => { if (!busy) dialog.close(); };
  dialog.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
  $('preset-form').onsubmit = async event => {
    event.preventDefault(); if (busy) return; busy = true; $('preset-confirm').disabled = true; $('preset-cancel').disabled = true; $('preset-form-error').textContent = '';
    try {
      const recipe = structuredClone(snapshot); if (!$('preset-crop').checked) delete recipe.composition;
      const body = operation === 'rename' ? { name: presetName($('preset-name').value) } : { name: presetName($('preset-name').value), recipe };
      const url = editing ? `/api/presets/${editing.id}` : '/api/presets';
      const result = await request(url, { method: operation === 'delete' ? 'DELETE' : editing ? 'PATCH' : 'POST', body: operation === 'delete' ? undefined : body });
      rows = rows.filter(r => r.id !== editing?.id); if (result.preset) rows.unshift(result.preset); render(); dialog.close(); api.toast(operation === 'delete' ? 'Preset removido.' : 'Preset guardado na sua coleção.');
    } catch (e) { $('preset-form-error').textContent = e.message; }
    finally { busy = false; $('preset-confirm').disabled = false; $('preset-cancel').disabled = false; }
  };
  $('preset-retry').onclick = refresh;
  const logout = button('Sair', 'Sair do cantinho', async () => { try { await request('/api/logout', { method: 'POST' }, false); location.replace('/login.html'); } catch (e) { if (e.status === 401) location.replace('/login.html'); else api.toast(e.message, true); } }, 'secondary-button logout-button');
  document.querySelector('.header-right').append(logout);
  refresh();
}
