import { textLayout } from './decorations.js';

export function mountTextEditor(api) {
  const $ = selector => document.querySelector(selector);
  const panel = $('#panel-text');
  panel.innerHTML = `<div class="text-actions"><button class="primary-button" id="add-text">＋ Adicionar texto</button><span>Arraste e gire na foto</span></div>
    <div id="text-list" class="text-list" aria-label="Textos nesta foto"></div>
    <div id="text-settings" hidden>
      <label class="text-field" for="text-content">Seu texto<textarea id="text-content" maxlength="240" rows="2" placeholder="Escreva uma lembrança…"></textarea></label>
      <div class="text-format"><label>Fonte<select id="text-font"><option value="sans">Moderna</option><option value="serif">Clássica</option><option value="mono">Máquina de escrever</option><option value="handwritten">Manuscrita</option></select></label><label>Cor<input id="text-color" type="color" value="#fffdf4"></label></div>
      <div class="text-options"><button id="text-bold" aria-pressed="false" aria-label="Negrito"><b>B</b></button><button id="text-italic" aria-pressed="false" aria-label="Itálico"><i>I</i></button><label><input type="checkbox" id="text-shadow" checked> Sombra</label><select id="text-align" aria-label="Alinhamento do texto"><option value="left">Esquerda</option><option value="center" selected>Centro</option><option value="right">Direita</option></select></div>
    </div><p id="text-empty" class="panel-tip">Adicione quantos textos quiser. Toque em um texto para editar.</p>`;
  const measure = document.createElement('canvas').getContext('2d');
  const selected = () => { const item = api.selected(); return item?.kind === 'text' ? item : null; };
  const resize = item => { const box = textLayout(measure, item); item.aspect = box.width / box.height; };
  $('#add-text').onclick = () => {
    if (!api.getPhoto()) return;
    if (api.getState().stickers.length >= 40) { api.toast('Remova um elemento para abrir espaço para outro.'); return; }
    const item = { id: crypto.randomUUID(), kind: 'text', text: 'Seu texto', font: 'serif', color: '#fffdf4', bold: false, italic: false, shadow: true, align: 'center', x: .5, y: .5, size: .6, rotation: 0 };
    resize(item); api.change(() => api.getState().stickers.push(item)); api.select(item.id);
    $('#text-content').focus(); $('#text-content').select();
  };
  function update(key, value, continuous = false) {
    const item = selected(); if (!item) return;
    const mutation = () => { item[key] = value; resize(item); };
    if (continuous) { api.begin(); mutation(); api.preview(); } else api.change(mutation);
  }
  $('#text-content').addEventListener('input', event => update('text', event.target.value, true));
  $('#text-content').addEventListener('blur', api.commit);
  $('#text-color').addEventListener('input', event => update('color', event.target.value, true));
  $('#text-color').addEventListener('change', api.commit);
  for (const key of ['font', 'align']) $(`#text-${key}`).onchange = event => update(key, event.target.value);
  for (const key of ['bold', 'italic']) $(`#text-${key}`).onclick = () => update(key, !selected()?.[key]);
  $('#text-shadow').onchange = event => update('shadow', event.target.checked);
  let listKey = '';
  function sync() {
    const item = selected(); $('#text-settings').hidden = !item; $('#text-empty').hidden = !!item;
    if (item) {
      if (document.activeElement !== $('#text-content')) $('#text-content').value = item.text;
      for (const key of ['font', 'color', 'align']) $(`#text-${key}`).value = item[key];
      for (const key of ['bold', 'italic']) $(`#text-${key}`).setAttribute('aria-pressed', String(!!item[key]));
      $('#text-shadow').checked = !!item.shadow;
    }
    const items = api.getState().stickers.filter(s => s.kind === 'text');
    const nextKey = JSON.stringify(items.map(s => [s.id, s.text, s.id === item?.id]));
    if (nextKey !== listKey) {
      listKey = nextKey; $('#text-list').replaceChildren();
      for (const text of items) { const button = document.createElement('button'); button.textContent = text.text || 'Texto vazio'; button.setAttribute('aria-pressed', String(text.id === item?.id)); button.onclick = () => api.select(text.id); $('#text-list').append(button); }
    }
  }
  return { sync };
}
