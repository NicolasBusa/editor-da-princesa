import { mountPresets } from './presets.js';
import { FRAMES, loadImage, preparePhoto, createDemoPhoto, renderEditor, clearRenderCache } from './renderer.js';
import { captureSeed, createState, defaultComposition } from './model.js';
import { mountCameraLibrary } from './camera-library.js';
import { mountStudio } from './studio-ui.js';
import { STICKERS } from './stickers.js';
import { mountMobileEditor } from './mobile-editor.js';
import { mountTextEditor } from './text-editor.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const ICONS = {
  text: '<path d="M4 5h16M12 5v15M8 20h8M4 5v3m16-3v3"/>',
  adjust: '<path d="M4 7h16M4 17h16M8 4v6m8 4v6"/>',
  compare: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 3v18m-9-9h9"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  'image-plus': '<rect x="3" y="3" width="15" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 16 5-5 6 6m-3-3 3-3 4 4M21 4v6m-3-3h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  sparkles: '<path d="m9 3 2.2 6.8L18 12l-6.8 2.2L9 21l-2.2-6.8L0 12l6.8-2.2L9 3Zm10-2 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Zm0 15 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
  frame: '<rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
  sticker: '<path d="M21 13V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h7Zm-8 8v-5a3 3 0 0 1 3-3h5"/><path d="M8 8v1m6-1v1m-6 4q3 3 6 0"/>',
  hand: '<path d="M8 13V6a2 2 0 0 1 4 0v6-3a2 2 0 0 1 4 0v3-1a2 2 0 0 1 4 0v5c0 4-2 6-6 6h-1c-2 0-4-1-5-3l-4-5a2 2 0 0 1 3-2l1 1Z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  undo: '<path d="m8 3-5 5 5 5M3 8h10a7 7 0 0 1 0 14"/>',
  redo: '<path d="m16 3 5 5-5 5m5-5H11a7 7 0 0 0 0 14"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 9M3 3v7h7"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  share: '<path d="M12 16V2m-5 5 5-5 5 5M7 11H4v11h16V11h-3"/>',
  resize: '<path d="M8 3H3v5m0-5 7 7m6 11h5v-5m0 5-7-7"/>',
  rotate: '<path d="M4 8a8 8 0 1 1-1 9M4 2v6h6"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.sparkles}</svg>`; }
function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); }); }
hydrateIcons();

const canvas = $('#photo-canvas');
const artboard = $('#artboard');
const stage = $('#stage');
const stickerLayer = $('#sticker-layer');
const assets = new Map();
const initialState = createState;
let state = initialState();
let photo = null;
let selectedId = null;
let undoStack = [];
let redoStack = [];
let transaction = null;
let painting = false;
let interactivePainting = false, lastFullRevision = -1, lastInteractiveRevision = -1;
let renderRevision = 0;
let studio = null, library = null;
let navigation = null, textEditor = null, reveal = false, interactiveUntil = 0, settleTimer;
let loadVersion = 0;
let toastTimer;
let category = 'coelhos';
const pointers = new Map();
let gesture = null;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clone = (value) => JSON.parse(JSON.stringify(value));
const selectedSticker = () => state.stickers.find((item) => item.id === selectedId);
const normalizeAngle = (value) => ((value + 180) % 360 + 360) % 360 - 180;
const newId = () => globalThis.crypto?.randomUUID?.() || `sticker-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function toast(message, error = false) {
  clearTimeout(toastTimer);
  $('#toast-text').textContent = message;
  $('#toast [data-icon]').innerHTML = icon(error ? 'heart' : 'check');
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, error ? 6500 : 3500);
}

function pushHistory(before) {
  if (JSON.stringify(before) === JSON.stringify(state)) return;
  library?.scheduleThumbnails();
  undoStack.push(before);
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  updateHistory();
}
function beginTransaction() { if (!transaction) transaction = clone(state); }
function commitTransaction() {
  if (!transaction) return;
  const before = transaction;
  transaction = null;
  pushHistory(before);
  interactiveUntil = 0; requestPaint();
}
function changeState(change, options = {}) {
  commitTransaction();
  const before = clone(state);
  change();
  reveal = !!options.reveal;
  pushHistory(before);
  refresh();
}
function undo() {
  endAllGestures();
  commitTransaction();
  if (!undoStack.length) return;
  redoStack.push(clone(state));
  studio?.cancelCrop();
  state = undoStack.pop();
  library?.scheduleThumbnails();
  if (!selectedSticker()) selectedId = null;
  refresh();
}
function redo() {
  endAllGestures();
  commitTransaction();
  if (!redoStack.length) return;
  undoStack.push(clone(state));
  studio?.cancelCrop();
  state = redoStack.pop();
  library?.scheduleThumbnails();
  if (!selectedSticker()) selectedId = null;
  refresh();
}
function updateHistory() {
  $('#undo-button').disabled = !undoStack.length;
  $('#redo-button').disabled = !redoStack.length;
}

async function paint() {
  const interactive = performance.now() < interactiveUntil;
  if (!photo || (interactive ? interactivePainting || lastInteractiveRevision === renderRevision : painting || lastFullRevision === renderRevision)) return;
  if (interactive) { interactivePainting = true; lastInteractiveRevision = renderRevision; }
  else { painting = true; lastFullRevision = renderRevision; }
  const revision = renderRevision, source = photo;
  const temp = document.createElement('canvas');
  const snapshot = clone(studio?.renderState() || state);
  $('#render-status').hidden = !reveal;
  try {
    await renderEditor(temp, source, snapshot, assets, { ...(studio?.renderOptions() || {}), ...(interactive ? { maxEdge: 260, maxPixels: 67600, kind: 'interactive' } : {}) });
    if (source === photo && (revision === renderRevision || (interactive && snapshot.camera === state.camera && snapshot.frame === state.frame && JSON.stringify(snapshot.stickers) === JSON.stringify(state.stickers) && JSON.stringify(snapshot.composition) === JSON.stringify(state.composition)))) {
      canvas.width = temp.width; canvas.height = temp.height;
      canvas.getContext('2d').drawImage(temp, 0, 0);
      syncStickerLayer();
      await studio?.afterPaint();
    }
  } catch (error) { toast(error.message || 'Não foi possível atualizar a foto. Tente novamente.', true); }
  finally {
    temp.width = temp.height = 1;
    if (interactive) interactivePainting = false; else painting = false;
    if (revision !== renderRevision) requestAnimationFrame(paint);
    else { reveal = false; $('#render-status').hidden = true; }
  }
}
function requestPaint() {
  renderRevision++;
  $('#render-status').hidden = !reveal;
  requestAnimationFrame(paint);
}
function livePreview() {
  reveal = false;
  interactiveUntil = performance.now() + 180;
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => { interactiveUntil = 0; requestPaint(); }, 190);
  refresh();
}
function rangeValue(input, value) {
  input.value = value;
  input.style.setProperty('--range-fill', `${(Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
}
function updateControls() {
  library?.sync();
  studio?.sync();
  textEditor?.sync();
  $$('.frame-card').forEach((button) => { const active = button.dataset.frame === state.frame; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
  rangeValue($('#intensity'), state.intensity);
  $('#intensity-value').textContent = `${state.intensity}%`;
  $('#intensity').disabled = false;
  const sticker = selectedSticker();
  $('#sticker-controls').hidden = !sticker;
  if (sticker) {
    $('#selected-sticker-name').textContent = sticker.kind === 'text' ? 'Seu texto' : STICKERS.find((item) => item.id === sticker.stickerId)?.name || 'Seu adesivo';
    $('#mirror-sticker').hidden = sticker.kind === 'text';
    $('#mirror-sticker').setAttribute('aria-pressed', String(!!sticker.flipX));
    rangeValue($('#sticker-size'), Math.round(sticker.size * 100));
    $('#sticker-size-value').textContent = `${Math.round(sticker.size * 100)}%`;
    rangeValue($('#sticker-rotation'), Math.round(normalizeAngle(sticker.rotation)));
    $('#sticker-rotation-value').textContent = `${Math.round(normalizeAngle(sticker.rotation))}°`;
  }
  updateHistory();
}
function refresh() { updateControls(); requestPaint(); }

function fitArtboard() { studio?.fit(); }
window.addEventListener('resize', fitArtboard);
function buildCameras() { library?.newPhoto(); }

function buildFrames() {
  for (const frame of FRAMES) {
    const button = document.createElement('button');
    button.className = 'frame-card'; button.dataset.frame = frame.id;
    button.setAttribute('aria-label', `Moldura ${frame.name}`);
    button.setAttribute('aria-pressed', state.frame === frame.id);
    button.innerHTML = `<span class="frame-swatch"><span class="frame-inside frame-${frame.id}"></span></span><span class="filter-name"></span>`;
    button.querySelector('.filter-name').textContent = frame.name;
    button.addEventListener('click', () => changeState(() => { state.frame = frame.id; }));
    $('#frame-grid').append(button);
  }
}
function buildStickers() {
  $('#sticker-grid').replaceChildren();
  for (const item of STICKERS.filter((sticker) => sticker.category === category)) {
    const button = document.createElement('button');
    button.className = 'sticker-card'; button.dataset.stickerId = item.id;
    button.setAttribute('aria-label', `Adicionar adesivo ${item.name}`); button.title = item.name;
    const img = new Image(); img.src = item.thumbnail || item.src; img.alt = ''; img.width = 70; img.height = 70; img.loading = 'lazy'; img.decoding = 'async';
    button.append(img);
    button.addEventListener('click', () => addSticker(item));
    $('#sticker-grid').append(button);
  }
}

function switchTab(id, moveFocus = false) {
  $$('.tool-tab').forEach((tab) => { const active = tab.dataset.tab === id; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', active); tab.tabIndex = active ? 0 : -1; if (active && moveFocus) tab.focus(); });
  $$('.tool-panel').forEach((panel) => { panel.hidden = panel.id !== `panel-${id}`; });
  studio?.sync();
  if (moveFocus) navigation?.open(id);
}
$$('.tool-tab').forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    const tabs = $$('.tool-tab');
    let next = tabs.indexOf(tab);
    if (event.key === 'ArrowRight') next = (next + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (next + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault(); switchTab(tabs[next].dataset.tab, true);
  });
});
$$('.category').forEach((button) => button.addEventListener('click', () => {
  category = button.dataset.category;
  $$('.category').forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', active); });
  buildStickers();
}));

async function addSticker(item) {
  if (!photo) { toast('Seu cantinho ainda está carregando. Só um instante.'); return; }
  if (state.stickers.length >= 40) { toast('Já temos 40 fofurinhas! Remova um adesivo para adicionar outro.'); return; }
  try {
    if (!assets.has(item.id)) assets.set(item.id, await loadImage(item.src));
    changeState(() => {
      const offset = (state.stickers.length % 5) * 0.035;
      const image = assets.get(item.id);
      const aspect = (image?.naturalWidth || image?.width || 1) / (image?.naturalHeight || image?.height || 1);
      const sticker = { id: newId(), stickerId: item.id, src: item.src, x: 0.45 + offset, y: 0.4 + offset, size: 0.27, aspect, rotation: 0 };
      state.stickers.push(sticker); selectedId = sticker.id;
    });
    $('#stage-caption-text').textContent = 'Arraste para mover. Use os cantinhos ou dois dedos para girar e redimensionar.';
  } catch { toast('Este adesivo não carregou. Tente novamente.', true); }
}
function removeSticker(id = selectedId) {
  if (!id) return;
  changeState(() => { state.stickers = state.stickers.filter((item) => item.id !== id); selectedId = null; });
}
function duplicateSticker() {
  const sticker = selectedSticker();
  if (!sticker) return;
  if (state.stickers.length >= 40) { toast('Remova um adesivo para abrir espaço para outro.'); return; }
  changeState(() => { const copy = { ...sticker, id: newId(), x: clamp(sticker.x + 0.06, 0.05, 0.95), y: clamp(sticker.y + 0.05, 0.05, 0.95) }; state.stickers.push(copy); selectedId = copy.id; });
}
function selectSticker(id) { selectedId = id; updateControls(); syncStickerLayer(); if (id) navigation?.open(selectedSticker()?.kind === 'text' ? 'text' : 'stickers'); }

function syncStickerLayer() {
  artboard.classList.toggle('has-selection', !!selectedSticker());
  const ids = new Set(state.stickers.map((item) => item.id));
  [...stickerLayer.children].forEach((element) => { if (!ids.has(element.dataset.id)) element.remove(); });
  for (const sticker of state.stickers) {
    let element = [...stickerLayer.children].find((child) => child.dataset.id === sticker.id);
    if (!element) {
      element = document.createElement('div');
      element.className = 'sticker-object'; element.dataset.id = sticker.id; element.tabIndex = 0;
      element.setAttribute('role', 'group');
      element.addEventListener('keydown', stickerKeydown);
      stickerLayer.append(element);
    }
    const name = sticker.kind === 'text' ? `Texto: ${sticker.text}` : STICKERS.find((item) => item.id === sticker.stickerId)?.name || 'Adesivo';
    element.setAttribute('aria-label', `${name}. Enter para selecionar, setas para mover e Delete para excluir.`);
    element.style.setProperty('--x', `${sticker.x * 100}%`);
    element.style.setProperty('--y', `${sticker.y * 100}%`);
    element.style.setProperty('--size', `${sticker.size * 100}%`);
    element.style.setProperty('--aspect', String(sticker.aspect || 1));
    element.style.setProperty('--rotation', `${sticker.rotation}deg`);
    const active = sticker.id === selectedId;
    element.classList.toggle('selected', active);
    element.classList.toggle('dragging', active && pointers.size > 0);
    if (active && !element.childElementCount) {
      for (const [action, name, symbol] of [['delete', 'Excluir adesivo', 'close'], ['resize', 'Redimensionar adesivo. Arraste ou use o controle de tamanho.', 'resize'], ['rotate', 'Girar adesivo. Arraste ou use o controle de rotação.', 'rotate']]) {
        const handle = document.createElement('button'); handle.type = 'button'; handle.className = `sticker-handle handle-${action}`; handle.dataset.action = action; handle.setAttribute('aria-label', name); handle.innerHTML = `<span data-icon="${symbol}">${icon(symbol)}</span>`;
        handle.addEventListener('click', (event) => { event.stopPropagation(); if (action === 'delete') removeSticker(sticker.id); });
        handle.addEventListener('keydown', (event) => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || action === 'delete') return;
          event.preventDefault(); event.stopPropagation();
          const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1;
          const current = state.stickers.find((item) => item.id === sticker.id);
          if (!current) return;
          changeState(() => { if (action === 'resize') current.size = clamp(current.size + direction * 0.02, 0.07, 1); else current.rotation = normalizeAngle(current.rotation + direction * 5); });
        });
        element.append(handle);
      }
    } else if (!active && element.childElementCount) element.replaceChildren();
  }
  // Preserve stacking and hit testing after undo restores a deleted sticker.
  state.stickers.forEach((sticker, index) => {
    const element = [...stickerLayer.children].find((child) => child.dataset.id === sticker.id);
    if (stickerLayer.children[index] !== element) stickerLayer.insertBefore(element, stickerLayer.children[index] || null);
  });
}

function stickerKeydown(event) {
  if (event.target !== event.currentTarget) return;
  const sticker = state.stickers.find((item) => item.id === event.currentTarget.dataset.id);
  if (!sticker) return;
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSticker(sticker.id); return; }
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); removeSticker(sticker.id); return; }
  const step = event.shiftKey ? 0.035 : 0.008;
  const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
  if (delta) { event.preventDefault(); selectedId = sticker.id; changeState(() => { sticker.x = clamp(sticker.x + delta[0], 0, 1); sticker.y = clamp(sticker.y + delta[1], 0, 1); }); }
}

function pointerPosition(event) { return { x: event.clientX, y: event.clientY }; }
function gestureBase(mode = 'drag') {
  const sticker = selectedSticker();
  if (!sticker || !pointers.size) return null;
  const points = [...pointers.values()];
  const rect = artboard.getBoundingClientRect();
  const center = { x: rect.left + sticker.x * rect.width, y: rect.top + sticker.y * rect.height };
  const primary = points[0];
  if (points.length > 1) {
    return { mode: 'pinch', sticker: { ...sticker }, rect, start: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }, distance: Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)), angle: Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) };
  }
  return { mode, sticker: { ...sticker }, rect, start: primary, center, distance: Math.max(1, Math.hypot(primary.x - center.x, primary.y - center.y)), angle: Math.atan2(primary.y - center.y, primary.x - center.x) };
}

artboard.addEventListener('pointerdown', (event) => {
  if (event.target.closest('#crop-layer, #compare-divider') || studio?.cropping || artboard.classList.contains('comparing')) return;
  if (event.button !== 0 && event.pointerType === 'mouse') return;
  const object = event.target.closest('.sticker-object');
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'delete') return;
  if (!object && !pointers.size) { selectSticker(null); return; }
  if (!object && !selectedSticker()) return;
  if (pointers.size >= 2) return;
  event.preventDefault();
  if (!pointers.size && object) selectSticker(object.dataset.id);
  beginTransaction();
  pointers.set(event.pointerId, pointerPosition(event));
  artboard.setPointerCapture(event.pointerId);
  gesture = gestureBase(action === 'resize' ? 'resize' : action === 'rotate' ? 'rotate' : 'drag');
});
artboard.addEventListener('pointermove', (event) => {
  if (!pointers.has(event.pointerId) || !gesture) return;
  event.preventDefault();
  pointers.set(event.pointerId, pointerPosition(event));
  const sticker = selectedSticker();
  if (!sticker) return;
  const points = [...pointers.values()];
  const point = points[0];
  const base = gesture.sticker;
  if (gesture.mode === 'pinch' && points.length > 1) {
    const center = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    sticker.x = clamp(base.x + (center.x - gesture.start.x) / gesture.rect.width, 0, 1);
    sticker.y = clamp(base.y + (center.y - gesture.start.y) / gesture.rect.height, 0, 1);
    sticker.size = clamp(base.size * Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / gesture.distance, 0.07, 1);
    sticker.rotation = normalizeAngle(base.rotation + (Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x) - gesture.angle) * 180 / Math.PI);
  } else if (gesture.mode === 'resize') {
    sticker.size = clamp(base.size * Math.hypot(point.x - gesture.center.x, point.y - gesture.center.y) / gesture.distance, 0.07, 1);
  } else if (gesture.mode === 'rotate') {
    sticker.rotation = normalizeAngle(base.rotation + (Math.atan2(point.y - gesture.center.y, point.x - gesture.center.x) - gesture.angle) * 180 / Math.PI);
  } else {
    sticker.x = clamp(base.x + (point.x - gesture.start.x) / gesture.rect.width, 0, 1);
    sticker.y = clamp(base.y + (point.y - gesture.start.y) / gesture.rect.height, 0, 1);
  }
  refresh();
});
function finishPointer(event) {
  if (!pointers.has(event.pointerId)) return;
  pointers.delete(event.pointerId);
  if (artboard.hasPointerCapture(event.pointerId)) artboard.releasePointerCapture(event.pointerId);
  if (pointers.size) gesture = gestureBase('drag');
  else { gesture = null; commitTransaction(); }
  refresh();
}
artboard.addEventListener('pointerup', finishPointer);
artboard.addEventListener('pointercancel', finishPointer);
artboard.addEventListener('lostpointercapture', finishPointer);
function endAllGestures() {
  const ids = [...pointers.keys()]; pointers.clear(); gesture = null;
  ids.forEach((id) => { if (artboard.hasPointerCapture(id)) artboard.releasePointerCapture(id); });
  commitTransaction();
}

function wireRange(selector, update) {
  const input = $(selector);
  input.addEventListener('pointerdown', beginTransaction);
  input.addEventListener('input', () => { beginTransaction(); update(Number(input.value)); if (selector.startsWith('#sticker-')) refresh(); else livePreview(); });
  input.addEventListener('change', commitTransaction);
  input.addEventListener('blur', commitTransaction);
  input.addEventListener('pointercancel', commitTransaction);
}
wireRange('#intensity', (value) => { state.intensity = value; });
wireRange('#camera-texture', (value) => { state.cameraTexture = value; });
wireRange('#sticker-size', (value) => { if (selectedSticker()) selectedSticker().size = value / 100; });
wireRange('#sticker-rotation', (value) => { if (selectedSticker()) selectedSticker().rotation = value; });
$('#duplicate-sticker').addEventListener('click', duplicateSticker);
$('#mirror-sticker').addEventListener('click', () => { const item = selectedSticker(); if (item) changeState(() => { item.flipX = !item.flipX; }); });
$('#remove-sticker').addEventListener('click', () => removeSticker());
$('#deselect-sticker').addEventListener('click', () => selectSticker(null));
$('#undo-button').addEventListener('click', undo);
$('#redo-button').addEventListener('click', redo);
$('#reset-button').addEventListener('click', () => {
  endAllGestures();
  studio?.cancelCrop();
  changeState(() => { state = { ...initialState(), seed: state.seed }; selectedId = null; });
  toast('Uma tela fresquinha. Você pode desfazer para voltar.');
});
document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, textarea, [contenteditable=true]')) return;
  if (event.key === 'Escape') { endAllGestures(); selectSticker(null); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) redo(); else undo(); }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
});
window.addEventListener('blur', endAllGestures);

async function usePhoto(file) {
  if (!file) return;
  const version = ++loadVersion;
  $('#artboard-loading').hidden = false;
  $('#artboard-loading span:last-child').textContent = 'Preparando sua lembrança…';
  $('#save-button').disabled = true;
  try {
    const prepared = await preparePhoto(file);
    if (version !== loadVersion) return;
    endAllGestures();
    photo = prepared.image;
    clearRenderCache();
    state.composition = defaultComposition();
    state.seed = captureSeed();
    studio?.onNewPhoto();
    navigation?.close();
    selectedId = null;
    undoStack = []; redoStack = [];
    $('#demo-badge').hidden = true;
    $('#upload-title').textContent = 'Trocar minha foto';
    $('#upload-subtitle').textContent = `${prepared.width} × ${prepared.height} px · original preservado`;
    $('#stage-caption-text').textContent = 'Sua lembrança, do seu jeitinho. Escolha os detalhes abaixo.';
    buildCameras(); fitArtboard(); refresh();
    toast('Sua foto chegou. Vamos deixar ela ainda mais linda?');
  } catch (error) { if (version === loadVersion) toast(error.message || 'Não consegui abrir sua foto. Tente novamente.', true); }
  finally { if (version === loadVersion) { $('#artboard-loading').hidden = true; $('#save-button').disabled = !photo; } }
}
$('#upload-button').addEventListener('click', () => $('#photo-input').click());
$('#photo-input').addEventListener('change', (event) => { const file = event.target.files?.[0]; event.target.value = ''; usePhoto(file); });
const uploadZone = $('#upload-button');
['dragenter', 'dragover'].forEach((type) => uploadZone.addEventListener(type, (event) => { event.preventDefault(); uploadZone.classList.add('drag-over'); }));
['dragleave', 'drop'].forEach((type) => uploadZone.addEventListener(type, (event) => { event.preventDefault(); uploadZone.classList.remove('drag-over'); }));
uploadZone.addEventListener('drop', (event) => usePhoto(event.dataTransfer.files[0]));
stage.addEventListener('dragover', (event) => event.preventDefault());
stage.addEventListener('drop', (event) => { event.preventDefault(); usePhoto(event.dataTransfer.files[0]); });
window.addEventListener('dragover', (event) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });
window.addEventListener('drop', (event) => { if (event.dataTransfer?.types.includes('Files')) event.preventDefault(); });

$('#love-button').addEventListener('click', () => $('#love-dialog').showModal());
$$('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => button.closest('dialog').close()));
$$('dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const box = dialog.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
}));


async function init() {
  buildFrames(); buildStickers();
  const version = loadVersion;
  try {
    const [demoResult] = await Promise.allSettled([createDemoPhoto()]);
    if (version !== loadVersion) return;
    if (demoResult.status !== 'fulfilled') throw new Error('A ilustração de exemplo não abriu. Escolha sua foto para começar.');
    photo = demoResult.value;
    fitArtboard(); await paint(); buildCameras(); updateControls();
    $('#save-button').disabled = false;
    $('#artboard-loading').hidden = true;
  } catch (error) {
    if (version !== loadVersion) return;
    $('#artboard-loading span:last-child').textContent = 'Escolha uma foto para começar ♡';
    $('#artboard-loading .loader').hidden = true;
    toast(error.message, true);
  }
}
const studioApi = { getState: () => state, getPhoto: () => photo, assets, begin: beginTransaction, commit: commitTransaction, change: changeState, preview: livePreview, select: selectSticker, selected: selectedSticker, toast, cancelCrop: () => studio?.cancelCrop() };
library = mountCameraLibrary(studioApi);
studio = mountStudio(studioApi);
mountPresets(studioApi);
textEditor = mountTextEditor({ ...studioApi, preview: refresh });
navigation = mountMobileEditor({ switchTab, fit: fitArtboard });
init();

