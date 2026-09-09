import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { processPixels, curveLUT } from '../processing.js';
import { CAMERA_PROFILES } from '../cameraProfiles/index.js';
import { createState as cameraState, GROUPS, HSL_BANDS, clone } from '../model.js';

const createState = () => ({ ...cameraState(), intensity: 0 });
let assertions = 0;
function test(name, callback) { callback(); assertions++; console.log(`✓ ${name}`); }
const width = 128, height = 96;
const pixels = new Uint8ClampedArray(width * height * 4);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = (y * width + x) * 4;
  pixels[i] = x / (width - 1) * 255;
  pixels[i + 1] = y / (height - 1) * 255;
  pixels[i + 2] = ((x * 7 + y * 11) % 128) / 127 * 255;
  if (x > 92 && y > 67) pixels[i] = pixels[i + 1] = pixels[i + 2] = 250;
  if (x < 20 && y < 18) pixels[i] = pixels[i + 1] = pixels[i + 2] = 12;
  pixels[i + 3] = 255;
}
const process = state => processPixels(new Uint8ClampedArray(pixels), width, height, state);
const hash = data => createHash('sha256').update(data).digest('hex');
const originalHash = hash(pixels);
const different = state => assert.notEqual(hash(process(state)), originalHash);
test('Exactly five named camera profiles', () => { assert.equal(CAMERA_PROFILES.length,5); assert.equal(new Set(CAMERA_PROFILES.map(p=>p.id)).size,5); });
test('Neutral adjustments at zero camera strength preserve every byte', () => assert.deepEqual(process(createState()), pixels));
for (const camera of CAMERA_PROFILES) test(camera.name + ': zero strength keeps manual edits', () => {
  const a = createState(); a.adjustments.light.exposure = .35; a.adjustments.color.temperature = 12; a.adjustments.analog.grain = 24; a.adjustments.analog.dust = 30;
  const b = clone(a); b.camera = camera.id; b.intensity = 0; b.flash.enabled = true;
  assert.deepEqual(process(a), process(b));
});
for (const group of GROUPS) for (const control of group.controls) test(`Real processing: ${group.name} / ${control[1]}`, () => {
  const state = createState(); const [id, , min, max, step, neutral] = control;
  state.adjustments[group.id][id] = id === 'exposure' ? .7 : id === 'grainSize' ? 4 : Math.min(max, Math.max(neutral + step, max * .65));
  if (id === 'grainSize') {
    state.adjustments.analog.grain = 60;
    const base = clone(state); base.adjustments.analog.grainSize = neutral;
    assert.notEqual(hash(process(state)), hash(process(base)));
  } else different(state);
});
for (const [band] of HSL_BANDS) for (const field of ['hue', 'saturation', 'luminance']) test(`HSL ${band}: ${field}`, () => {
  const state = createState(); state.adjustments.hsl[band][field] = field === 'hue' ? 30 : 55; different(state);
});
for (const channel of ['rgb', 'red', 'green', 'blue']) for (let point = 0; point < 5; point++) test(`Curve ${channel}: point ${point}`, () => {
  const state = createState(); state.adjustments.curves[channel][point] += point === 4 ? -.1 : .1; different(state);
});
for (const band of ['shadows', 'midtones', 'highlights']) for (const field of ['hue', 'saturation', 'luminance']) test(`Color grading ${band}: ${field}`, () => {
  const state = createState(); state.adjustments.grading[band][field] = field === 'hue' ? 230 : 55;
  if (field === 'hue') { state.adjustments.grading[band].saturation = 55; const base = clone(state); base.adjustments.grading[band].hue = 35; assert.notEqual(hash(process(state)), hash(process(base))); }
  else different(state);
});
test('Curves are smooth and bounded, with no overshoot on monotonic inputs', () => {
  const curve = curveLUT([.02, .21, .53, .78, .99]);
  for (let i = 1; i < curve.length; i++) { assert.ok(curve[i] >= curve[i - 1]); assert.ok(curve[i] - curve[i - 1] < .001); }
});
test('Exposure and brightness are different operators', () => {
  const a = createState(), b = createState(); a.adjustments.light.exposure = .5; b.adjustments.light.brightness = 50; assert.notEqual(hash(process(a)), hash(process(b)));
});
test('Vibrance is not uniform saturation', () => {
  const a = createState(), b = createState(); a.adjustments.color.saturation = 45; b.adjustments.color.vibrance = 45; assert.notEqual(hash(process(a)), hash(process(b)));
});
test('Temperature is not a global hue rotation', () => {
  const a = createState(), b = createState(); a.adjustments.color.temperature = 30; b.adjustments.color.hue = 30; assert.notEqual(hash(process(a)), hash(process(b)));
});
test('Camera texture can be disabled while keeping colors', () => {
  const a = createState(); a.camera = 'flash800'; a.intensity = 100; a.cameraTexture = 100; const b = clone(a); b.cameraTexture = 0;
  assert.notEqual(hash(process(a)), hash(process(b))); assert.notEqual(hash(process(b)), originalHash);
});
test('Complex combinations are deterministic and keep alpha intact', () => {
  const state = createState(); state.camera = 'lomo32'; state.intensity = 100; state.adjustments.light.shadows = 24; state.adjustments.color.vibrance = 20;
  Object.assign(state.adjustments.analog, { grain: 35, lightLeaks: 40, dust: 60, scratches: 45, bloom: 20, halation: 35, vignette: 15 });
  Object.assign(state.adjustments.details, { denoise: 20, texture: 10, sharpness: 15, clarity: 8 });
  const a = process(state), b = process(state); assert.deepEqual(a, b);
  for (let i = 3; i < a.length; i += 4) assert.equal(a[i], 255);
});
test('Dust location does not change when brightness changes', () => {
  const flat = new Uint8ClampedArray(width * height * 4); for (let i = 0; i < flat.length; i += 4) { flat[i] = flat[i + 1] = flat[i + 2] = 120; flat[i + 3] = 255; }
  const a = createState(); a.adjustments.analog.dust = 100;
  const b = clone(a); b.adjustments.light.brightness = 30;
  const baseB = clone(b); baseB.adjustments.analog.dust = 0;
  const outA = processPixels(new Uint8ClampedArray(flat), width, height, a), outB = processPixels(new Uint8ClampedArray(flat), width, height, b), neutralB = processPixels(new Uint8ClampedArray(flat), width, height, baseB);
  let same = 0, total = 0;
  for (let i = 0; i < flat.length; i += 4) if (Math.abs(outA[i] - flat[i]) > 3) { total++; if (Math.abs(outB[i] - neutralB[i]) > 1) same++; }
  assert.ok(total > 0); assert.ok(same / total > .98);
});
test('Halation stays inactive in a dim uniform scene', () => {
  const dark = new Uint8ClampedArray(width * height * 4).fill(50); for(let i=3;i<dark.length;i+=4)dark[i]=255;
  const state=createState();state.adjustments.analog.halation=100;
  assert.deepEqual(processPixels(new Uint8ClampedArray(dark),width,height,state),dark);
});
test('Film texture does not mutate its input recipe', () => {
  const state = createState(); state.camera = 'flash800'; state.intensity = 100; const before = clone(state); process(state); assert.deepEqual(state, before);
});
console.log(`\n${assertions} processing assertions passed.`);
