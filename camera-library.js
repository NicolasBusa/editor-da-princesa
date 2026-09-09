import { CAMERA_PROFILES, getCameraProfile } from './cameraProfiles/index.js';
import { renderThumbnail, getGeometry } from './renderer.js';
import { clone, captureSeed } from './model.js';

export function mountCameraLibrary(api) {
  const $ = selector => document.querySelector(selector), grid = $('#camera-grid');
  const cache = new Map(), controls = [];
  let favorites = new Set(), generation = 0, timer;
  try { favorites = new Set(JSON.parse(localStorage.getItem('princesa.favorite-cameras') || '[]')); } catch { /* Optional storage. */ }
  function build() {
    generation++; grid.replaceChildren();
    for (const camera of CAMERA_PROFILES) {
      const item = document.createElement('div'); item.className = 'filter-item';
      const button = document.createElement('button'); button.className = 'filter-card camera-card'; button.dataset.camera = camera.id;
      button.setAttribute('aria-label', `${camera.name}. ${camera.description}`);
      const thumb = document.createElement('span'); thumb.className = 'filter-thumb'; thumb.style.background = `${camera.color}25`;
      const image = new Image(); image.alt = ''; image.src = cache.get(camera.id) || './assets/demo.svg'; thumb.append(image);
      const name = document.createElement('span'); name.className = 'filter-name'; name.textContent = camera.name;
      const label = document.createElement('span'); label.className = 'filter-family-label'; label.textContent = camera.format.label;
      button.append(thumb, name, label);
      button.addEventListener('click', () => { api.cancelCrop(); api.change(() => { api.getState().camera = camera.id; }, { reveal: true }); });
      const favorite = document.createElement('button'); favorite.className = 'filter-favorite'; favorite.dataset.favorite = camera.id;
      favorite.addEventListener('click', () => { favorites.has(camera.id) ? favorites.delete(camera.id) : favorites.add(camera.id); try { localStorage.setItem('princesa.favorite-cameras', JSON.stringify([...favorites])); } catch {} sync(); });
      item.append(button, favorite); grid.append(item);
    }
    sync(); generate();
  }
  async function generate() {
    const photo = api.getPhoto(); if (!photo) return;
    const version = ++generation, state = clone(api.getState());
    for (const camera of CAMERA_PROFILES) {
      if (version !== generation) return;
      try {
        const url = cache.get(camera.id) || await renderThumbnail(photo, { ...state, camera: camera.id }, 210);
        if (version !== generation || photo !== api.getPhoto()) return;
        cache.set(camera.id, url); grid.querySelector(`[data-camera="${camera.id}"] img`).src = url;
      } catch { /* Keep the last successful thumbnail; main canvas reports errors. */ }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  function scheduleThumbnails() { clearTimeout(timer); generation++; timer = setTimeout(() => { cache.clear(); generate(); }, 450); }
  for (const [id, key] of [['grain', 'grain'], ['frame', 'frame'], ['leaks', 'lightLeaks']]) {
    $(`#camera-${id}`).addEventListener('change', event => api.change(() => { api.getState().cameraOptions[key] = event.target.checked; }));
  }
  $('#flash-enabled').addEventListener('change', event => api.change(() => { api.getState().flash.enabled = event.target.checked; }));
  for (const [key, label, min, max, step, factor, unit] of [
    ['power', 'Potência', 0, 100, 1, 1, '%'], ['distance', 'Distância aproximada', 1.2, 3.5, .1, 1, ' m'],
    ['x', 'Posição horizontal', 10, 90, 1, 100, '%'], ['y', 'Posição vertical', 10, 90, 1, 100, '%'],
  ]) {
    const row = document.createElement('div'); row.className = 'flash-row';
    const labelEl = document.createElement('label'); labelEl.htmlFor = `flash-${key}`; labelEl.textContent = label;
    const output = document.createElement('output'); output.htmlFor = labelEl.htmlFor; labelEl.append(output);
    const input = document.createElement('input'); input.type = 'range'; input.id = labelEl.htmlFor; input.min = min; input.max = max; input.step = step;
    input.addEventListener('pointerdown', api.begin); input.addEventListener('input', () => { api.begin(); api.getState().flash[key] = Number(input.value) / factor; sync(); api.preview(); });
    ['change', 'blur', 'pointercancel'].forEach(event => input.addEventListener(event, api.commit));
    row.append(labelEl, input); $('#flash-settings').append(row); controls.push({key,input,output,factor,unit});
  }
  $('#new-capture').addEventListener('click', () => { api.change(() => { api.getState().seed = captureSeed(); }); api.toast('Uma nova captura, com o mesmo enquadramento e seus ajustes.'); });
  function sync() {
    const state = api.getState(), camera = getCameraProfile(state.camera);
    grid.querySelectorAll('[data-camera]').forEach(button => { const active = button.dataset.camera === camera.id; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
    grid.querySelectorAll('[data-favorite]').forEach(button => { const active = favorites.has(button.dataset.favorite); button.textContent = active ? '♥' : '♡'; button.setAttribute('aria-pressed', active); button.setAttribute('aria-label', `${active ? 'Remover dos' : 'Adicionar aos'} favoritos: ${getCameraProfile(button.dataset.favorite).name}`); });
    const photo = api.getPhoto(), geometry = photo ? getGeometry(photo, state) : null;
    const orientation = geometry && geometry.fullHeight > geometry.fullWidth ? '2:3' : '3:2';
    const label = profile => profile.format.autoOrient ? `35 mm · ${orientation}` : profile.format.label;
    grid.querySelectorAll('[data-camera]').forEach(button => { button.querySelector('.filter-family-label').textContent = label(getCameraProfile(button.dataset.camera)); });
    $('#current-camera-name').textContent = camera.name; $('#current-camera-description').textContent = camera.description; $('#camera-format').textContent = label(camera);
    $('#camera-texture').value = state.cameraTexture; $('#camera-texture').style.setProperty('--range-fill', `${state.cameraTexture}%`); $('#camera-texture-value').textContent = `${state.cameraTexture}%`;
    $('#camera-grain').checked = state.cameraOptions.grain; $('#camera-frame').checked = state.cameraOptions.frame; $('#camera-leaks').checked = state.cameraOptions.lightLeaks;
    $('#camera-frame-label').hidden = !camera.format.print; $('#camera-leaks-label').hidden = camera.id !== 'dream120';
    $('#flash-controls').hidden = !camera.flash; $('#flash-enabled').checked = state.flash.enabled; $('#flash-settings').hidden = !state.flash.enabled;
    for (const c of controls) { c.input.value = state.flash[c.key] * c.factor; c.output.value = `${Number(c.input.value).toFixed(c.key === 'distance' ? 1 : 0)}${c.unit}`; c.input.style.setProperty('--range-fill', `${(Number(c.input.value)-Number(c.input.min))/(Number(c.input.max)-Number(c.input.min))*100}%`); }
  }
  return {build,sync,scheduleThumbnails,newPhoto: () => { cache.clear(); build(); }};
}
