import { createState, GROUPS, HSL_BANDS } from './model.js';
import { CAMERA_BY_ID } from './cameraProfiles/index.js';

const cameras = [...CAMERA_BY_ID.keys()];
const fail = () => { throw new Error('As configurações deste preset são inválidas ou incompatíveis.'); };
const number = (v, min, max) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fail();
const boolean = v => typeof v === 'boolean' ? v : fail();
const choice = (v, values) => values.includes(v) ? v : fail();
export function presetName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 60 || /[\u0000-\u001f]/.test(value)) throw new Error('Escolha um nome de 1 a 60 caracteres.');
  return value.trim();
}
/** Whitelisted, versioned recipe. Photos, text, stickers and random seeds never leave the browser. */
export function validateRecipe(input) {
  try {
    if (input?.version !== 1) fail();
    const out = { version: 1 }, defaults = createState();
    out.camera = choice(input.camera, cameras);
    out.intensity = number(input.intensity, 0, 100);
    out.cameraTexture = number(input.cameraTexture, 0, 100);
    out.cameraOptions = Object.fromEntries(Object.keys(defaults.cameraOptions).map(k => [k, boolean(input.cameraOptions[k])]));
    out.flash = { enabled: boolean(input.flash.enabled), power: number(input.flash.power, 0, 100), distance: number(input.flash.distance, 1.2, 3.5), x: number(input.flash.x, 0, 1), y: number(input.flash.y, 0, 1) };
    out.adjustments = {};
    for (const group of GROUPS) out.adjustments[group.id] = Object.fromEntries(group.controls.map(([key, , min, max]) => [key, number(input.adjustments[group.id][key], min, max)]));
    out.adjustments.hsl = Object.fromEntries(HSL_BANDS.map(([id]) => [id, Object.fromEntries(['hue', 'saturation', 'luminance'].map(k => [k, number(input.adjustments.hsl[id][k], k === 'hue' ? -45 : -100, k === 'hue' ? 45 : 100)]))]));
    out.adjustments.curves = Object.fromEntries(['rgb', 'red', 'green', 'blue'].map(id => {
      const points = input.adjustments.curves[id];
      if (!Array.isArray(points) || points.length !== 5) fail();
      return [id, points.map(v => number(v, 0, 1))];
    }));
    out.adjustments.grading = Object.fromEntries(['shadows', 'midtones', 'highlights'].map(id => {
      const g = input.adjustments.grading[id];
      return [id, { hue: number(g.hue, 0, 360), saturation: number(g.saturation, 0, 100), luminance: number(g.luminance, -100, 100) }];
    }));
    out.frame = choice(input.frame, ['none', 'manteiga', 'nuvens', 'polaroid', 'coracoes']);
    if (input.composition !== undefined) {
      const c = input.composition, crop = c.crop;
      if (c.ratio !== 'free' && !(typeof c.ratio === 'string' && Number(c.ratio) > 0 && Number(c.ratio) < 10)) fail();
      out.composition = { rotation: choice(c.rotation, [0, 90, 180, 270]), straighten: number(c.straighten, -15, 15), flipX: boolean(c.flipX), flipY: boolean(c.flipY), ratio: c.ratio, crop: { x: number(crop.x, 0, 1), y: number(crop.y, 0, 1), width: number(crop.width, .001, 1), height: number(crop.height, .001, 1) } };
      if (crop.x + crop.width > 1.000001 || crop.y + crop.height > 1.000001) fail();
    }
    return out;
  } catch { return fail(); }
}
export function capturePreset(state, includeComposition = false) {
  return validateRecipe({ ...state, version: 1, composition: includeComposition ? state.composition : undefined });
}
export function applyPreset(state, recipe) { const { version, ...settings } = validateRecipe(recipe); Object.assign(state, settings); }
