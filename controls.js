import { GROUPS, HSL_BANDS, defaultAdjustments, defaultComposition, clamp, clone } from './model.js';
import { curveLUT } from './processing.js';
import { getCameraProfile } from './cameraProfiles/index.js';

const at = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);
function setAt(object, path, value) { const keys = path.split('.'); const last = keys.pop(); const parent = keys.reduce((value, key) => value[key], object); parent[last] = value; }
const el = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text) element.textContent = text; return element; };
const format = (value, step = 1, unit = '') => `${step < 1 ? Number(value).toFixed(step < .1 ? 2 : 1) : Math.round(value)}${unit === '°' ? '°' : unit ? ` ${unit}` : ''}`;

export function mountControls(root, api) {
  const sliders = [];
  let hslChannel = 'orange', curveChannel = 'rgb', gradeChannel = 'shadows';
  const get = () => api.getState();

  function slider(parent, path, label, min, max, step, neutral, unit = '', help = '') {
    const row = el('div', 'adjustment-row'); row.dataset.path = path;
    const heading = el('div', 'adjustment-label'), id = `control-${path.replaceAll('.', '-')}`;
    const caption = el('label', '', label); caption.htmlFor = id;
    const valueBox = el('div', 'control-value');
    const output = el('output'); output.htmlFor = id;
    const reset = el('button', 'reset-control', '↺'); reset.type = 'button'; reset.title = `Restaurar ${label}`; reset.setAttribute('aria-label', `Restaurar ${label}`);
    const input = el('input'); input.type = 'range'; input.id = id; input.min = min; input.max = max; input.step = step;
    if (help) { caption.title = help; input.setAttribute('aria-description', help); }
    input.addEventListener('pointerdown', api.begin);
    input.addEventListener('input', () => { api.begin(); setAt(get(), path, Number(input.value)); sync(); api.preview(); });
    ['change', 'blur', 'pointercancel'].forEach(event => input.addEventListener(event, api.commit));
    reset.addEventListener('click', () => api.change(() => setAt(get(), path, neutral)));
    heading.append(caption, valueBox); valueBox.append(output, reset); row.append(heading, input); parent.append(row);
    sliders.push({ path, input, output, step, unit, row }); return row;
  }
  function group(id, name, subtitle, open = false) {
    const details = el('details', 'adjustment-group'); details.dataset.group = id; details.open = open;
    const summary = el('summary'); summary.append(el('span', 'group-symbol', '+'), el('span', '', name));
    const count = el('span', 'group-count'); count.dataset.count = id; summary.append(count);
    const content = el('div', 'group-content');
    const bar = el('div', 'group-description'); bar.append(el('p', '', subtitle));
    const reset = el('button', 'text-reset', 'Restaurar grupo'); reset.type = 'button'; reset.dataset.resetGroup = id;
    reset.addEventListener('click', () => api.change(() => {
      if (id === 'composition') { get().composition = defaultComposition(); api.action?.('cancel-crop'); }
      else get().adjustments[id] = clone(defaultAdjustments()[id]);
    }));
    content.append(bar, reset); details.append(summary, content); root.append(details); return content;
  }
  for (const definition of GROUPS.slice(0, 2)) {
    const parent = group(definition.id, definition.name, definition.description, definition.id === 'light');
    for (const control of definition.controls) slider(parent, `adjustments.${definition.id}.${control[0]}`, ...control.slice(1));
  }
  const advancedLabel = el('p', 'advanced-label', 'SEU PEQUENO LABORATÓRIO'); root.append(advancedLabel);
  const hslRoot = group('hsl', 'HSL · por cor', 'Ajuste uma faixa; as vizinhas se misturam suavemente.');
  const hslTabs = el('div', 'color-channel-tabs'); hslTabs.setAttribute('aria-label', 'Faixa de cor HSL');
  const hslPanels = new Map();
  for (const [id, name, , color] of HSL_BANDS) {
    const button = el('button', 'color-channel'); button.style.setProperty('--channel-color', color); button.title = name; button.setAttribute('aria-label', `Faixa ${name}`); button.dataset.hslChannel = id;
    button.addEventListener('click', () => { hslChannel = id; sync(); }); hslTabs.append(button);
    const panel = el('div', 'hsl-panel'); panel.append(el('p', 'channel-name', name));
    slider(panel, `adjustments.hsl.${id}.hue`, 'Matiz', -45, 45, 1, 0, '°');
    slider(panel, `adjustments.hsl.${id}.saturation`, 'Saturação', -100, 100, 1, 0);
    slider(panel, `adjustments.hsl.${id}.luminance`, 'Luminância', -100, 100, 1, 0);
    hslPanels.set(id, panel);
  }
  hslRoot.append(hslTabs, ...hslPanels.values());

  const curvesRoot = group('curves', 'Curvas de tons', 'Arraste os pontos ou use as setas. Cada canal tem cinco pontos.');
  const curveTabs = el('div', 'segment-control');
  for (const [id, name] of [['rgb', 'Geral'], ['red', 'R'], ['green', 'G'], ['blue', 'B']]) {
    const button = el('button', '', name); button.dataset.curveChannel = id; button.addEventListener('click', () => { curveChannel = id; sync(); }); curveTabs.append(button);
  }
  const graph = el('div', 'curve-graph'); graph.tabIndex = -1;
  graph.innerHTML = '<svg viewBox="0 0 256 256" aria-hidden="true"><defs><linearGradient id="curve-shade"><stop stop-color="#2d2e29"/><stop offset="1" stop-color="#fffdf5"/></linearGradient></defs><path class="curve-grid" d="M0 64H256M0 128H256M0 192H256M64 0V256M128 0V256M192 0V256"/><path class="curve-identity" d="M0 256 256 0"/><path class="curve-line"/></svg>';
  const curvePoints = [];
  for (let i = 0; i < 5; i++) {
    const point = el('button', 'curve-point'); point.dataset.point = i; point.setAttribute('role', 'slider'); point.setAttribute('aria-valuemin', '0'); point.setAttribute('aria-valuemax', '100'); point.setAttribute('aria-label', `Curva: ponto de entrada ${i * 25}%`);
    point.addEventListener('pointerdown', event => { event.preventDefault(); api.begin(); point.setPointerCapture(event.pointerId); });
    point.addEventListener('pointermove', event => {
      if (!point.hasPointerCapture(event.pointerId)) return;
      const box = graph.getBoundingClientRect(); get().adjustments.curves[curveChannel][i] = Math.round(clamp(1 - (event.clientY - box.top) / box.height, 0, 1) * 100) / 100;
      sync(); api.preview();
    });
    ['pointerup', 'pointercancel'].forEach(type => point.addEventListener(type, event => { if (point.hasPointerCapture(event.pointerId)) point.releasePointerCapture(event.pointerId); api.commit(); }));
    point.addEventListener('keydown', event => {
      if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); api.change(() => {
        const curve = get().adjustments.curves[curveChannel];
        curve[i] = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : clamp(curve[i] + (event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? .05 : .01), 0, 1);
      });
    }); graph.append(point); curvePoints.push(point);
  }
  const curveInputs = el('div', 'curve-numbers');
  const numbers = [];
  for (let i = 0; i < 5; i++) {
    const label = el('label', '', `${i * 25}%`), input = el('input'); input.type = 'number'; input.min = 0; input.max = 100; input.step = 1; input.setAttribute('aria-label', `Saída da curva no ponto ${i * 25}%`);
    input.addEventListener('change', () => api.change(() => { get().adjustments.curves[curveChannel][i] = clamp(Number(input.value) || 0, 0, 100) / 100; })); label.append(input); curveInputs.append(label); numbers.push(input);
  }
  curvesRoot.append(curveTabs, graph, curveInputs);

  const gradingRoot = group('grading', 'Color grading', 'Cor independente nas sombras, meios-tons e realces. A intensidade zero mantém a faixa neutra.');
  const gradingTabs = el('div', 'segment-control'), gradePanels = new Map();
  for (const [id, name] of [['shadows', 'Sombras'], ['midtones', 'Meios-tons'], ['highlights', 'Realces']]) {
    const button = el('button', '', name); button.dataset.gradeChannel = id; button.addEventListener('click', () => { gradeChannel = id; sync(); }); gradingTabs.append(button);
    const panel = el('div'); panel.append(el('div', 'grade-preview')); panel.dataset.gradePreview = id;
    slider(panel, `adjustments.grading.${id}.hue`, 'Cor', 0, 360, 1, 35, '°');
    slider(panel, `adjustments.grading.${id}.saturation`, 'Intensidade da cor', 0, 100, 1, 0);
    slider(panel, `adjustments.grading.${id}.luminance`, 'Luminância', -100, 100, 1, 0);
    gradePanels.set(id, panel);
  }
  gradingRoot.append(gradingTabs, ...gradePanels.values());
  for (const definition of GROUPS.slice(2)) {
    const parent = group(definition.id, definition.name, definition.description);
    for (const control of definition.controls) slider(parent, `adjustments.${definition.id}.${control[0]}`, ...control.slice(1));
  }

  const composition = group('composition', 'Composição', 'Recorte reversível. O alinhamento aproxima a foto para evitar cantos vazios.');
  const rotationActions = el('div', 'composition-actions');
  for (const [action, label] of [['rotate-left', '↶ 90°'], ['rotate-right', '↷ 90°'], ['flip-x', '↔ Espelhar'], ['flip-y', '↕ Virar']]) {
    const button = el('button', 'secondary-button', label); button.dataset.compositionAction = action;
    button.addEventListener('click', () => api.change(() => {
      const c = get().composition;
      if (action.startsWith('rotate')) { c.rotation = ((c.rotation + (action === 'rotate-left' ? -90 : 90)) % 360 + 360) % 360; c.crop = defaultComposition().crop; }
      if (action === 'flip-x') c.flipX = !c.flipX;
      if (action === 'flip-y') c.flipY = !c.flipY;
    })); rotationActions.append(button);
  }
  composition.append(rotationActions);
  slider(composition, 'composition.straighten', 'Alinhamento', -15, 15, .1, 0, '°');
  const ratioLabel = el('label', 'select-label', 'Formato da câmera'), ratio = el('select'); ratio.id = 'crop-ratio'; ratio.disabled = true;
  const formatOption = el('option'); ratio.append(formatOption); ratioLabel.append(ratio);
  const orientation = el('p', 'camera-format'); orientation.id = 'composition-orientation'; composition.append(orientation);
  const startCrop = el('button', 'secondary-button', 'Recortar na fotografia'); startCrop.id = 'start-crop'; startCrop.addEventListener('click', () => api.action('crop', ratio.value));
  composition.append(ratioLabel, startCrop);

  function sync() {
    const state = get();
    for (const control of sliders) {
      const value = at(state, control.path) ?? 0;
      control.input.value = value; control.output.value = format(value, control.step, control.unit);
      control.input.style.setProperty('--range-fill', `${(value - Number(control.input.min)) / (Number(control.input.max) - Number(control.input.min)) * 100}%`);
      control.input.setAttribute('aria-valuetext', control.output.value);
    }
    for (const [id, panel] of hslPanels) panel.hidden = hslChannel !== id;
    hslTabs.querySelectorAll('button').forEach(button => { const active = button.dataset.hslChannel === hslChannel; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
    curveTabs.querySelectorAll('button').forEach(button => { const active = button.dataset.curveChannel === curveChannel; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
    const values = state.adjustments.curves[curveChannel];
    graph.style.setProperty('--curve-color', { rgb: '#a68a3e', red: '#b96560', green: '#739472', blue: '#749abd' }[curveChannel]);
    const lut = curveLUT(values, 65); graph.querySelector('.curve-line').setAttribute('d', [...lut].map((value, i) => `${i ? 'L' : 'M'}${i * 4},${256 - value * 256}`).join(' '));
    curvePoints.forEach((point, i) => { point.style.left = `${i * 25}%`; point.style.top = `${(1 - values[i]) * 100}%`; point.setAttribute('aria-valuenow', Math.round(values[i] * 100)); numbers[i].value = Math.round(values[i] * 100); });
    for (const [id, panel] of gradePanels) { panel.hidden = id !== gradeChannel; const value = state.adjustments.grading[id]; panel.querySelector('.grade-preview').style.background = `hsl(${value.hue} ${value.saturation}% 65%)`; }
    gradingTabs.querySelectorAll('button').forEach(button => { const active = button.dataset.gradeChannel === gradeChannel; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
    const cameraFormat = getCameraProfile(state.camera).format, photo = api.getPhoto?.();
    let width = photo?.naturalWidth || photo?.width || 1, height = photo?.naturalHeight || photo?.height || 1;
    if (Math.abs(state.composition.rotation) % 180 === 90) [width, height] = [height, width];
    formatOption.value = String(cameraFormat.autoOrient && height > width ? 1/cameraFormat.ratio : cameraFormat.ratio); formatOption.textContent = cameraFormat.autoOrient ? `35 mm · ${height > width ? '2:3' : '3:2'}` : cameraFormat.label;
    ratio.value = formatOption.value;
    orientation.textContent = `Rotação ${state.composition.rotation}°${state.composition.flipX ? ' · espelho horizontal' : ''}${state.composition.flipY ? ' · espelho vertical' : ''}`;
    rotationActions.querySelectorAll('button').forEach(button => { const id = button.dataset.compositionAction; button.setAttribute('aria-pressed', id === 'flip-x' ? state.composition.flipX : id === 'flip-y' ? state.composition.flipY : false); });
    const defaults = defaultAdjustments();
    root.querySelectorAll('[data-count]').forEach(counter => {
      const id = counter.dataset.count, current = id === 'composition' ? state.composition : state.adjustments[id], neutral = id === 'composition' ? defaultComposition() : defaults[id];
      counter.textContent = JSON.stringify(current) === JSON.stringify(neutral) ? '' : 'editado';
    });
  }
  sync(); return { sync };
}
