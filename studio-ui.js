import { getCameraProfile } from './cameraProfiles/index.js';
import { mountControls } from './controls.js';
import { clone, clamp, defaultAdjustments, defaultComposition, neutralPhotoState } from './model.js';
import { getGeometry, getExportSize, LIMITS, renderEditor, exportPhoto } from './renderer.js';

const $ = selector => document.querySelector(selector);
export function mountStudio(api) {
  const artboard = $('#artboard'), viewport = $('#stage-viewport');
  let zoom = 'fit', comparing = false, divider = 50, crop = null, cropRatio = 'free', cropGesture = null;
  let beforeKey = '', beforePhoto = null, exporting = false, exportUrl = null, exportFile = null;
  const controls = mountControls($('#adjustments-root'), { ...api, preview: api.preview, action: (action, value) => { if (action === 'crop') beginCrop(value); if (action === 'cancel-crop') closeCrop(); } });

  function renderState() {
    if (!crop) return api.getState();
    const state = clone(api.getState()); state.composition.crop = defaultComposition().crop; state.formatBypass = true; state.frame = 'none'; state.stickers = []; state.caption = ''; return state;
  }
  function renderOptions() { return zoom === 'fit' ? (matchMedia('(max-width:700px)').matches ? { maxEdge: 780, maxPixels: 608400 } : {}) : { maxEdge: LIMITS.exportEdge, maxPixels: LIMITS.exportPixels }; }
  function fit() {
    const photo = api.getPhoto(); if (!photo) return;
    const geometry = getGeometry(photo, renderState()), ratio = geometry.width / geometry.height;
    const gutter = matchMedia('(max-width:700px)').matches ? 8 : 32;
    const fitWidth = Math.min(viewport.clientWidth - gutter, (viewport.clientHeight - gutter) * ratio, geometry.width);
    const width = zoom === 'fit' ? Math.max(1, fitWidth) : geometry.width * Number(zoom) / 100;
    artboard.style.width = `${width}px`; artboard.style.aspectRatio = String(ratio);
    viewport.classList.toggle('zoomed', zoom !== 'fit'); $('#zoom-select').value = zoom;
    const result = getGeometry(photo, api.getState());
    $('#photo-dimensions').textContent = `${result.width} × ${result.height}`;
  }
  new ResizeObserver(fit).observe(viewport);
  function setZoom(value) {
    if (!api.getPhoto()) return;
    if (crop && value !== 'fit') { api.toast('Aplique o recorte antes de aproximar.'); return; }
    const geometry = getGeometry(api.getPhoto(), api.getState());
    if (value !== 'fit' && (geometry.width * geometry.height > LIMITS.exportPixels || Math.max(geometry.width, geometry.height) > LIMITS.exportEdge)) {
      api.toast('A visualização em pixels reais está disponível até 24 MP e 8192 px por lado. Recorte a foto para inspecionar uma região.', true); $('#zoom-select').value = zoom; return;
    }
    zoom = value; fit(); beforeKey = ''; api.preview();
  }
  $('#zoom-select').addEventListener('change', event => setZoom(event.target.value));
  for (const [id, direction] of [['#zoom-in', 1], ['#zoom-out', -1]]) $(id).addEventListener('click', () => {
    if (!api.getPhoto()) return;
    const geometry = getGeometry(api.getPhoto(), renderState());
    const current = zoom === 'fit' ? artboard.clientWidth / geometry.width * 100 : Number(zoom);
    const options = [25, 50, 100, 200];
    const next = direction > 0 ? options.find(value => value > current + .5) : options.reverse().find(value => value < current - .5);
    setZoom(next ? String(next) : direction < 0 ? 'fit' : '200');
  });
  let pan = null;
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || zoom === 'fit' || crop || event.target.closest('.sticker-object,button,.compare-divider')) return;
    event.preventDefault(); pan = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', event => { if (pan && viewport.hasPointerCapture(event.pointerId)) { viewport.scrollLeft = pan.left - event.clientX + pan.x; viewport.scrollTop = pan.top - event.clientY + pan.y; } });
  ['pointerup', 'pointercancel'].forEach(type => viewport.addEventListener(type, event => { if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId); pan = null; }));

  function updateDivider(value) {
    divider = clamp(Number(value), 0, 100);
    $('#before-layer').style.clipPath = `inset(0 ${100 - divider}% 0 0)`;
    $('#compare-divider').style.left = `${divider}%`;
    $('#compare-handle').setAttribute('aria-valuenow', Math.round(divider));
    $('#compare-position').value = divider; $('#compare-position').style.setProperty('--range-fill', `${divider}%`); $('#compare-value').textContent = `${Math.round(divider)}%`;
  }
  function setCompare(value) {
    if (value && crop) { api.toast('Aplique ou cancele o recorte antes de comparar.'); return; }
    comparing = value; api.select(null);
    $('#compare-button').setAttribute('aria-pressed', value);
    $('#before-layer').hidden = $('#compare-divider').hidden = $('#compare-range-row').hidden = !value;
    artboard.classList.toggle('comparing', value); updateDivider(divider); api.preview();
  }
  $('#compare-button').addEventListener('click', () => setCompare(!comparing));
  $('#compare-position').addEventListener('input', event => updateDivider(event.target.value));
  const compareHandle = $('#compare-handle');
  compareHandle.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); compareHandle.setPointerCapture(event.pointerId); });
  compareHandle.addEventListener('pointermove', event => { if (!compareHandle.hasPointerCapture(event.pointerId)) return; const bounds = artboard.getBoundingClientRect(); updateDivider((event.clientX - bounds.left) / bounds.width * 100); });
  ['pointerup', 'pointercancel'].forEach(type => compareHandle.addEventListener(type, event => { if (compareHandle.hasPointerCapture(event.pointerId)) compareHandle.releasePointerCapture(event.pointerId); }));
  compareHandle.addEventListener('keydown', event => {
    const delta = { ArrowLeft: -2, ArrowRight: 2, ArrowDown: -2, ArrowUp: 2 }[event.key];
    if (delta || event.key === 'Home' || event.key === 'End') { event.preventDefault(); updateDivider(event.key === 'Home' ? 0 : event.key === 'End' ? 100 : divider + delta); }
  });
  async function afterPaint() {
    fit();
    if (!comparing || !api.getPhoto()) return;
    const photo = api.getPhoto(), state = neutralPhotoState(api.getState()), key = JSON.stringify([state.composition, state.camera, state.cameraOptions, zoom]);
    if (beforeKey === key && beforePhoto === photo) return;
    const temp = document.createElement('canvas');
    await renderEditor(temp, photo, state, new Map(), { ...renderOptions(), kind: 'before' });
    if (photo === api.getPhoto() && comparing) {
      const before = $('#before-canvas'); before.width = temp.width; before.height = temp.height; before.getContext('2d').drawImage(temp, 0, 0); beforeKey = key; beforePhoto = photo;
    }
    temp.width = temp.height = 1;
  }

  function ratioNumber() {
    if (cropRatio === 'free') return null;
    const geometry = getGeometry(api.getPhoto(), { ...api.getState(), formatBypass: true, composition: { ...api.getState().composition, crop: defaultComposition().crop } });
    return cropRatio === 'original' ? geometry.width / geometry.height : Number(cropRatio);
  }
  function constrainCrop(next, keep = 'width') {
    const photo = api.getPhoto(); if (!photo) return next;
    const c = { ...next }, geometry = getGeometry(photo, { ...api.getState(), formatBypass: true, composition: { ...api.getState().composition, crop: defaultComposition().crop } });
    const ratio = ratioNumber();
    c.width = clamp(c.width, .03, 1); c.height = clamp(c.height, .03, 1);
    if (ratio) {
      const normalized = ratio * geometry.height / geometry.width;
      if (keep === 'height') c.width = c.height * normalized; else c.height = c.width / normalized;
      if (c.height > 1) { c.width /= c.height; c.height = 1; }
      if (c.width > 1) { c.height /= c.width; c.width = 1; }
      if (c.width < .03) { c.width = .03; c.height = .03 / normalized; }
      if (c.height < .03) { c.height = .03; c.width = .03 * normalized; }
    }
    c.x = clamp(c.x, 0, 1 - c.width); c.y = clamp(c.y, 0, 1 - c.height);
    return c;
  }
  function beginCrop(ratio = 'free') {
    if (!api.getPhoto()) { api.toast('Escolha uma foto primeiro.'); return; }
    api.commit(); api.select(null); if (comparing) setCompare(false);
    zoom = 'fit';
    const source = getGeometry(api.getPhoto(), { ...api.getState(), formatBypass: true }), format = getCameraProfile(api.getState().camera).format;
    cropRatio = String(format.autoOrient && source.fullHeight > source.fullWidth ? 1 / format.ratio : format.ratio);
    const select = $('#crop-ratio'); if (![...select.options].some(option => option.value === cropRatio)) select.add(new Option(format.label, cropRatio));
    api.toast('O recorte acompanha o formato desta câmera. Mova e ajuste a área da foto.');
    crop = constrainCrop(clone(api.getState().composition.crop));
    $('#crop-layer').hidden = $('#crop-toolbar').hidden = false;
    artboard.classList.add('cropping'); updateCrop(); api.preview();
    if (matchMedia('(max-width:700px)').matches) $('#stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function closeCrop() { crop = null; cropGesture = null; $('#crop-layer').hidden = $('#crop-toolbar').hidden = true; artboard.classList.remove('cropping'); }
  function updateCrop() {
    if (!crop) return;
    const box = $('#crop-box'); box.style.left = `${crop.x * 100}%`; box.style.top = `${crop.y * 100}%`; box.style.width = `${crop.width * 100}%`; box.style.height = `${crop.height * 100}%`;
    for (const key of ['x', 'y', 'width', 'height']) $(`#crop-${key}`).value = (crop[key] * 100).toFixed(1);
    $('#crop-ratio').value = cropRatio;
    const geometry = getGeometry(api.getPhoto(), { ...api.getState(), composition: { ...api.getState().composition, crop } });
    $('#crop-size-label').textContent = `${geometry.width} × ${geometry.height} px`;
    $('#crop-height').disabled = cropRatio !== 'free';
  }
  $('#crop-cancel').addEventListener('click', () => { closeCrop(); api.preview(); });
  $('#crop-apply').addEventListener('click', () => {
    if (!crop) return;
    const result = clone(crop), ratio = cropRatio;
    closeCrop(); api.change(() => { api.getState().composition.crop = result; api.getState().composition.ratio = ratio; });
    api.toast('Recorte aplicado. Seu original continua intacto.');
  });
  for (const key of ['x', 'y', 'width', 'height']) $(`#crop-${key}`).addEventListener('change', event => {
    if (!crop) return;
    crop = constrainCrop({ ...crop, [key]: Number(event.target.value) / 100 }, key === 'height' ? 'height' : 'width'); updateCrop();
  });
  const cropBox = $('#crop-box');
  cropBox.addEventListener('pointerdown', event => {
    if (!crop) return;
    event.preventDefault(); event.stopPropagation();
    cropGesture = { handle: event.target.closest('[data-crop-handle]')?.dataset.cropHandle, start: clone(crop), x: event.clientX, y: event.clientY, bounds: artboard.getBoundingClientRect() }; cropBox.setPointerCapture(event.pointerId);
  });
  cropBox.addEventListener('pointermove', event => {
    if (!cropGesture || !crop || !cropBox.hasPointerCapture(event.pointerId)) return;
    const g = cropGesture, dx = (event.clientX - g.x) / g.bounds.width, dy = (event.clientY - g.y) / g.bounds.height, next = { ...g.start };
    if (!g.handle) { next.x += dx; next.y += dy; }
    else {
      if (g.handle.includes('e')) next.width = clamp(g.start.width + dx, .03, 1 - g.start.x);
      if (g.handle.includes('w')) { next.x = clamp(g.start.x + dx, 0, g.start.x + g.start.width - .03); next.width = g.start.x + g.start.width - next.x; }
      if (g.handle.includes('s')) next.height = clamp(g.start.height + dy, .03, 1 - g.start.y);
      if (g.handle.includes('n')) { next.y = clamp(g.start.y + dy, 0, g.start.y + g.start.height - .03); next.height = g.start.y + g.start.height - next.y; }
    }
    crop = constrainCrop(next);
    if (g.handle?.includes('w')) crop.x = clamp(g.start.x + g.start.width - crop.width, 0, 1 - crop.width);
    if (g.handle?.includes('n')) crop.y = clamp(g.start.y + g.start.height - crop.height, 0, 1 - crop.height);
    updateCrop();
  });
  ['pointerup', 'pointercancel'].forEach(type => cropBox.addEventListener(type, event => { if (cropBox.hasPointerCapture(event.pointerId)) cropBox.releasePointerCapture(event.pointerId); cropGesture = null; }));
  cropBox.addEventListener('keydown', event => {
    if (!crop) return;
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta) return;
    event.preventDefault(); const step = event.shiftKey ? .03 : .005;
    const handle = event.target.dataset.cropHandle;
    crop = constrainCrop(handle ? { ...crop, width: crop.width + delta[0] * step, height: crop.height + delta[1] * step } : { ...crop, x: crop.x + delta[0] * step, y: crop.y + delta[1] * step }, handle && delta[1] ? 'height' : 'width'); updateCrop();
  });

  $('#reset-adjustments').addEventListener('click', () => api.change(() => { api.getState().adjustments = defaultAdjustments(); }));
  function exportOptions() {
    const mode = $('#export-size').value;
    const options = { format: $('#export-format').value, quality: Number($('#jpeg-quality').value) / 100 };
    if (mode === 'original') options.original = true;
    if (mode === 'custom') {
      options.width = Number($('#export-width').value); options.height = Number($('#export-height').value);
      if (!options.width || !options.height) throw new Error('Preencha a largura e a altura desejadas.');
    }
    if (/^\d+$/.test(mode)) options.maxEdge = Number(mode);
    return options;
  }
  function updateExport() {
    if (!api.getPhoto()) return;
    $('#export-custom').hidden = $('#export-size').value !== 'custom';
    $('#jpeg-quality-row').hidden = $('#export-format').value !== 'jpeg';
    $('#jpeg-quality-value').textContent = `${$('#jpeg-quality').value}%`; $('#jpeg-quality').style.setProperty('--range-fill', `${(Number($('#jpeg-quality').value) - 40) / .6}%`);
    try {
      const size = getExportSize(api.getPhoto(), api.getState(), exportOptions());
      $('#export-dimensions').textContent = `${size.width} × ${size.height} px · ${(size.width * size.height / 1_000_000).toFixed(1)} MP`;
      $('#export-error').hidden = true; $('#render-export').disabled = exporting;
    } catch (error) { $('#export-error').textContent = error.message; $('#export-error').hidden = false; $('#render-export').disabled = true; }
  }
  $('#save-button').addEventListener('click', () => {
    if (!api.getPhoto()) return;
    if (crop) { api.toast('Aplique ou cancele o recorte antes de exportar.'); return; }
    api.commit();
    const size = getExportSize(api.getPhoto(), api.getState());
    $('#export-width').value = size.width; $('#export-height').value = size.height;
    $('#export-settings').hidden = false; $('#export-result').hidden = true; updateExport(); $('#export-dialog').showModal();
  });
  ['#export-size', '#export-format'].forEach(id => $(id).addEventListener('change', updateExport));
  $('#jpeg-quality').addEventListener('input', updateExport);
  for (const id of ['width', 'height']) $(`#export-${id}`).addEventListener('input', event => {
    if (!api.getPhoto()) return;
    const geometry = getGeometry(api.getPhoto(), api.getState());
    const value = Number(event.target.value);
    if (id === 'width') $('#export-height').value = Math.max(1, Math.round(value * geometry.height / geometry.width));
    else $('#export-width').value = Math.max(1, Math.round(value * geometry.width / geometry.height));
    updateExport();
  });
  $('#render-export').addEventListener('click', async () => {
    if (exporting || !api.getPhoto()) return;
    exporting = true; updateExport(); $('#render-export').textContent = 'Preparando sua imagem…';
    const photo = api.getPhoto(), state = clone(api.getState());
    try {
      const options = exportOptions(), size = getExportSize(photo, state, options);
      const blob = await exportPhoto(photo, state, api.assets, options);
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      exportUrl = URL.createObjectURL(blob);
      const extension = options.format === 'jpeg' ? 'jpg' : 'png';
      exportFile = new File([blob], `minha-criacao-princesa.${extension}`, { type: blob.type });
      $('#export-preview').src = exportUrl; $('#download-link').href = exportUrl; $('#download-link').download = exportFile.name;
      $('#download-label').textContent = `Baixar ${options.format === 'jpeg' ? 'JPEG' : 'PNG'}`;
      $('#export-file-info').textContent = `${size.width} × ${size.height} px · ${blob.size > 1_000_000 ? (blob.size / 1_000_000).toFixed(1) + ' MB' : Math.round(blob.size / 1000) + ' KB'}`;
      let canShare = false; try { canShare = !!navigator.canShare?.({ files: [exportFile] }); } catch { /* Download is always available. */ }
      $('#share-button').hidden = !canShare;
      $('#export-help').textContent = /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'Para guardar no app Fotos, use Compartilhar → Salvar Imagem. Você também pode manter a prévia pressionada.' : 'O download salva sua criação no aparelho. Nenhuma foto foi enviada a um servidor.';
      $('#export-settings').hidden = true; $('#export-result').hidden = false;
    } catch (error) { $('#export-error').textContent = error.message || 'Não foi possível exportar. Escolha uma dimensão menor.'; $('#export-error').hidden = false; }
    finally { exporting = false; $('#render-export').disabled = false; $('#render-export').textContent = 'Preparar imagem'; }
  });
  $('#export-back').addEventListener('click', () => { $('#export-settings').hidden = false; $('#export-result').hidden = true; updateExport(); });
  $('#download-link').addEventListener('click', () => api.toast('Download solicitado. Sua lembrança está pronta para guardar.'));
  $('#share-button').addEventListener('click', async () => {
    if (!exportFile) return;
    try { await navigator.share({ files: [exportFile], title: 'Minha criação · Editor da Princesa' }); }
    catch (error) { if (error.name !== 'AbortError') api.toast('Não foi possível compartilhar. Use o botão de download.', true); }
  });
  window.addEventListener('pagehide', event => { if (!event.persisted && exportUrl) URL.revokeObjectURL(exportUrl); });
  function sync() {
    if (!$('#panel-adjust').hidden) controls.sync();
    if (crop) updateCrop();
    fit();
  }
  function onNewPhoto() { closeCrop(); zoom = 'fit'; beforeKey = ''; beforePhoto = null; if (comparing) setCompare(false); document.body.classList.add('has-photo'); fit(); }
  return { sync, fit, renderState, renderOptions, afterPaint, onNewPhoto, cancelCrop: closeCrop, get cropping() { return !!crop; } };
}
