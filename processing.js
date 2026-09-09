import { renderFilm } from './filmEngine/index.js';
import { defaultAdjustments, HSL_BANDS, clamp } from './model.js';

const TAU = Math.PI * 2;
const NEUTRAL = defaultAdjustments();
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const luminance = (r, g, b) => .2126 * r + .7152 * g + .0722 * b;
const linear = x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
const srgb = x => x <= .0031308 ? x * 12.92 : 1.055 * Math.max(0, x) ** (1 / 2.4) - .055;

/** Shape-preserving cubic interpolation: continuous slopes, no overshoot between knots. */
export function curveLUT(points = [0, .25, .5, .75, 1], length = 4097) {
  const p = points.map(value => clamp(value, 0, 1));
  const d = p.slice(1).map((v, i) => (v - p[i]) * 4);
  const slope = [d[0], ...[1, 2, 3].map(i => d[i - 1] * d[i] <= 0 ? 0 : 2 * d[i - 1] * d[i] / (d[i - 1] + d[i])), d[3]];
  const lut = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const x = i / (length - 1) * 4, k = Math.min(3, Math.floor(x)), t = x - k;
    const t2 = t * t, t3 = t2 * t;
    lut[i] = clamp((2 * t3 - 3 * t2 + 1) * p[k] + (t3 - 2 * t2 + t) * slope[k] / 4 + (-2 * t3 + 3 * t2) * p[k + 1] + (t3 - t2) * slope[k + 1] / 4, Math.min(p[k], p[k + 1]), Math.max(p[k], p[k + 1]));
  }
  return lut;
}
function lookup(lut, x) { const p = clamp(x, 0, 1) * (lut.length - 1), a = Math.floor(p); return mix(lut[a], lut[Math.min(a + 1, lut.length - 1)], p - a); }
function rgbHsl(r, g, b, out) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  let h = 0, s = 0;
  if (d > 1e-8) { s = d / Math.max(1e-8, 1 - Math.abs(2 * l - 1)); h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
  out[0] = h; out[1] = s; out[2] = l;
}
function hslRgb(h, s, l, out) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * clamp(s, 0, 1), h6 = h / 60, x = c * (1 - Math.abs(h6 % 2 - 1)), m = l - c / 2;
  if (h6 < 1) { out[0] = c; out[1] = x; out[2] = 0; }
  else if (h6 < 2) { out[0] = x; out[1] = c; out[2] = 0; }
  else if (h6 < 3) { out[0] = 0; out[1] = c; out[2] = x; }
  else if (h6 < 4) { out[0] = 0; out[1] = x; out[2] = c; }
  else if (h6 < 5) { out[0] = x; out[1] = 0; out[2] = c; }
  else { out[0] = c; out[1] = 0; out[2] = x; }
  out[0] += m; out[1] += m; out[2] += m;
}
function colorDistance(a, b) { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); }
function skinMask(h, s) { return Math.exp(-((colorDistance(h, 28) / 29) ** 2)) * smooth(.05, .19, s) * (1 - smooth(.8, 1, s)); }
function adjustHsl(hsl, bands, protect = 0) {
  let weight = 0, hue = 0, saturation = 0, light = 0;
  for (const band of bands) {
    const distance = colorDistance(hsl[0], band[0]);
    if (distance > band[4]) continue;
    const w = .5 + .5 * Math.cos(Math.PI * distance / band[4]);
    hue += band[1] * w; saturation += band[2] * w; light += band[3] * w; weight += w;
  }
  if (weight) {
    const scale = 1 - protect * .7 * skinMask(hsl[0], hsl[1]);
    hsl[0] += hue / Math.max(1, weight) * scale;
    hsl[1] = clamp(hsl[1] * (1 + saturation / 100 / Math.max(1, weight) * scale), 0, 1);
    hsl[2] = clamp(hsl[2] + light / 100 / Math.max(1, weight) * .35 * Math.sin(Math.PI * hsl[2]), 0, 1);
  }
}
function bandsFrom(data, arrays = false) {
  return HSL_BANDS.map(([id, , center]) => {
    const a = data?.[id];
    return [center, arrays ? a?.[0] || 0 : a?.hue || 0, arrays ? a?.[1] || 0 : a?.saturation || 0, arrays ? a?.[2] || 0 : a?.luminance || 0, ['red', 'orange', 'yellow', 'purple', 'magenta'].includes(id) ? 40 : 65];
  }).filter(a => a[1] || a[2] || a[3]);
}
function coloredTone(hue) { const out = [0, 0, 0]; hslRgb(hue, .8, .5, out); const l = luminance(...out); return out.map(c => c - l); }
function hasChanges(a) { return JSON.stringify(a) !== JSON.stringify(NEUTRAL); }

/** Color decisions remain floating point until a single final 8-bit write. */
function applyColors(data, state) {
  const a = state.adjustments || NEUTRAL, light = { ...NEUTRAL.light, ...a.light }, color = { ...NEUTRAL.color, ...a.color };
  if (!hasChanges(a)) return;
  const curve = ['rgb', 'red', 'green', 'blue'].map(id => curveLUT(a.curves?.[id]));
  const hsl = [0, 0, 0], rgb = [0, 0, 0];
  const manualBands = bandsFrom(a.hsl);
  const grading = ['shadows', 'midtones', 'highlights'].map(id => { const v = a.grading?.[id] || NEUTRAL.grading[id]; return { ...v, rgb: coloredTone(v.hue) }; });
  const gradeActive = grading.some(v => v.saturation || v.luminance);
  const manualColorActive = Object.values(color).some(Boolean) || manualBands.length;
  const lightActive = Object.values(light).some(Boolean);
  const exposure = 2 ** light.exposure;
  // LUT for exposure in linear light, followed by a continuous highlight shoulder.
  const exposureLUT = new Float32Array(4097);
  for (let i = 0; i < exposureLUT.length; i++) {
    const x = i / 4096;
    let y = srgb(linear(x) * exposure);
    if (exposure > 1 && y > .87) y = .87 + .13 * (1 - Math.exp(-(y - .87) / .13));
    exposureLUT[i] = y;
  }
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    if (lightActive) {
      if (light.exposure) { r = lookup(exposureLUT, r); g = lookup(exposureLUT, g); b = lookup(exposureLUT, b); }
      let l = luminance(r, g, b);
      const shift = light.brightness / 100 * .24 * Math.sin(Math.PI * clamp(l, 0, 1))
        + light.shadows / 100 * .23 * (1 - smooth(.04, .62, l)) * smooth(0, .035, l)
        + light.highlights / 100 * .22 * smooth(.38, .93, l) * (1 - smooth(.98, 1, l))
        + light.blacks / 100 * .13 * (1 - smooth(0, .36, l))
        + light.whites / 100 * .13 * smooth(.63, 1, l);
      r += shift; g += shift; b += shift;
      if (light.contrast) {
        const contrast = 1 + light.contrast / 100 * .78;
        const sigmoid = v => {
          v = clamp(v, .000001, .999999);
          return 1 / (1 + ((1 - v) / v) ** contrast);
        };
        r = sigmoid(r); g = sigmoid(g); b = sigmoid(b);
      }
    }
    r = clamp(r, 0, 1); g = clamp(g, 0, 1); b = clamp(b, 0, 1);
    if (manualColorActive) {
      const l = luminance(r, g, b), m = Math.sin(Math.PI * clamp(l, 0, 1));
      r += (color.temperature * .0015 + color.tint * .00055) * m;
      g -= color.tint * .00085 * m;
      b += (-color.temperature * .0015 + color.tint * .0005) * m;
      rgbHsl(clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1), hsl);
      const protect = skinMask(hsl[0], hsl[1]);
      hsl[0] += color.hue;
      hsl[1] = clamp(hsl[1] * (1 + color.saturation / 100), 0, 1);
      hsl[1] = clamp(hsl[1] * (1 + color.vibrance / 100 * (1 - hsl[1]) * (1 - protect * .7)), 0, 1);
      if (manualBands.length) adjustHsl(hsl, manualBands);
      hslRgb(...hsl, rgb); [r, g, b] = rgb;
    }
    r = lookup(curve[1], lookup(curve[0], r));
    g = lookup(curve[2], lookup(curve[0], g));
    b = lookup(curve[3], lookup(curve[0], b));
    if (gradeActive) {
      const l = luminance(r, g, b), weights = [1 - smooth(.12, .55, l), 0, smooth(.45, .88, l)];
      weights[1] = 1 - weights[0] - weights[2];
      const protect = .35 + .65 * Math.sin(Math.PI * l);
      for (let n = 0; n < 3; n++) {
        const grade = grading[n], amount = grade.saturation / 100 * .32 * weights[n] * protect, bright = grade.luminance / 100 * .16 * weights[n];
        r += grade.rgb[0] * amount + bright; g += grade.rgb[1] * amount + bright; b += grade.rgb[2] * amount + bright;
      }
    }
    data[i] = clamp(r, 0, 1) * 255; data[i + 1] = clamp(g, 0, 1) * 255; data[i + 2] = clamp(b, 0, 1) * 255;
  }
}

/** O(N) separable box blur on luminance; radii scale with the full composition. */
function blurField(field, width, height, radius) {
  radius = Math.max(1, Math.round(radius));
  const tmp = new Float32Array(field.length), out = new Float32Array(field.length), span = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    const row = y * width; let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += field[row + clamp(k, 0, width - 1)];
    for (let x = 0; x < width; x++) { tmp[row + x] = sum / span; sum += field[row + Math.min(width - 1, x + radius + 1)] - field[row + Math.max(0, x - radius)]; }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let k = -radius; k <= radius; k++) sum += tmp[clamp(k, 0, height - 1) * width + x];
    for (let y = 0; y < height; y++) { out[y * width + x] = sum / span; sum += tmp[Math.min(height - 1, y + radius + 1) * width + x] - tmp[Math.max(0, y - radius) * width + x]; }
  }
  return out;
}
function lumaField(data) { const field = new Float32Array(data.length / 4); for (let i = 0, j = 0; i < data.length; i += 4, j++) field[j] = luminance(data[i], data[i + 1], data[i + 2]); return field; }
function denoise(data, width, height, amount) {
  const source = new Uint8ClampedArray(data), strength = amount / 100, threshold = 45 + strength * 600;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4; let r = 0, g = 0, b = 0, weights = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const n = (clamp(y + dy, 0, height - 1) * width + clamp(x + dx, 0, width - 1)) * 4;
      const distance = (source[n] - source[i]) ** 2 + (source[n + 1] - source[i + 1]) ** 2 + (source[n + 2] - source[i + 2]) ** 2;
      const weight = 1 / (1 + distance / threshold) * (dx && dy ? .7 : 1);
      r += source[n] * weight; g += source[n + 1] * weight; b += source[n + 2] * weight; weights += weight;
    }
    data[i] = mix(source[i], r / weights, strength); data[i + 1] = mix(source[i + 1], g / weights, strength); data[i + 2] = mix(source[i + 2], b / weights, strength);
  }
}
function details(data, width, height, settings) {
  if (settings.denoise > 0) denoise(data, width, height, settings.denoise);
  if (!settings.sharpness && !settings.texture && !settings.clarity) return;
  const source = lumaField(data), edge = Math.max(width, height);
  for (const [value, radius, strength, threshold] of [[settings.sharpness, edge / 1600, .95, 1.3], [settings.texture, edge / 480, .9, .3], [settings.clarity, edge / 70, .7, 0]]) {
    if (!value) continue;
    const blurred = blurField(source, width, height, radius);
    for (let p = 0, i = 0; p < source.length; p++, i += 4) {
      const difference = source[p] - blurred[p];
      const gate = smooth(threshold, threshold + 6, Math.abs(difference));
      const midtone = .35 + .65 * Math.sin(Math.PI * source[p] / 255);
      const adjustment = clamp(difference * value / 100 * strength * gate * midtone, -32, 32);
      data[i] += adjustment; data[i + 1] += adjustment; data[i + 2] += adjustment;
    }
  }
}

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function noise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y), tx = x - ix, ty = y - iy;
  const u = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  return mix(mix(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), u), mix(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), u), v) * 2 - 1;
}
function addSpeck(data, width, height, x, y, radius, opacity, bright, scratch = false) {
  const minX = Math.max(0, Math.floor(x - radius * (scratch ? .35 : 1))), maxX = Math.min(width - 1, Math.ceil(x + radius * (scratch ? .35 : 1)));
  const minY = Math.max(0, Math.floor(y - radius * (scratch ? 14 : 1))), maxY = Math.min(height - 1, Math.ceil(y + radius * (scratch ? 14 : 1)));
  for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
    const dx = (px + .5 - x) / radius / (scratch ? .35 : 1), dy = (py + .5 - y) / radius / (scratch ? 14 : 1);
    const distance = dx * dx + dy * dy;
    if (distance > 1) continue;
    const alpha = (1 - smooth(.05, 1, distance)) * opacity;
    const i = (py * width + px) * 4;
    for (let c = 0; c < 3; c++) data[i + c] = mix(data[i + c], bright ? 241 : 46, alpha);
  }
}
function analog(data, width, height, settings, seed) {
  const edge = Math.max(width, height), amount = settings.grain / 100;
  let bloom = null, halo = null, mask = null;
  if (settings.bloom || settings.halation) {
    mask = new Float32Array(width * height);
    for (let p = 0, i = 0; p < mask.length; p++, i += 4) mask[p] = smooth(177, 245, luminance(data[i], data[i + 1], data[i + 2])) * (data[i + 3] / 255);
    if (settings.bloom) bloom = blurField(blurField(mask, width, height, edge / 95), width, height, edge / 125);
    if (settings.halation) halo = blurField(blurField(mask, width, height, edge / 190), width, height, edge / 210);
  }
  const grainScale = 1500 / Math.max(.5, settings.grainSize || 1.5);
  const grainSampling = Math.min(1, edge / grainScale);
  const grainStrength = amount * (4 + 10 * grainSampling);
  const leaks = settings.lightLeaks / 100, vignette = settings.vignette / 100, fade = settings.fade / 100;
  const leakY = .18 + hash2(1, 9, seed) * .55;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4, p = i / 4;
    if (!data[i + 3]) continue;
    const nx = (x + .5) / width, ny = (y + .5) / height;
    let r = data[i], g = data[i + 1], b = data[i + 2];
    if (fade) { r = mix(r, 23 + r * .84, fade); g = mix(g, 22 + g * .84, fade); b = mix(b, 21 + b * .84, fade); }
    if (bloom) { const value = bloom[p] * settings.bloom / 100 * .35; r += (255 - r) * value; g += (255 - g) * value; b += (255 - b) * value * .96; }
    if (halo) {
      const value = Math.max(0, halo[p] - mask[p] * .6) * settings.halation / 100;
      r += (255 - r) * value * .9; g += (235 - g) * value * .25; b += (140 - b) * value * .055;
    }
    if (leaks) {
      const v = Math.exp(-nx * nx * 34 - (ny - leakY) ** 2 * 5) * leaks * .62 + Math.exp(-((nx - 1) ** 2) * 130 - (ny - .87) ** 2 * 11) * leaks * .32;
      r += (255 - r) * v; g += (208 - g) * v * .6; b += (119 - b) * v * .22;
    }
    if (vignette) { const distance = ((nx - .5) / .7) ** 2 + ((ny - .5) / .7) ** 2, value = 1 - smooth(.18, 1.1, distance) * vignette * .62; r *= value; g *= value; b *= value; }
    if (amount) {
      const n = noise(nx * grainScale, ny * grainScale * height / width, seed) * .78 + noise(nx * grainScale * 1.93, ny * grainScale * height / width * 1.93, seed ^ 931) * .22;
      const l = luminance(r, g, b) / 255, amplitude = grainStrength * (.28 + .72 * Math.sin(Math.PI * clamp(l, 0, 1)));
      r += n * amplitude; g += n * amplitude * .96; b += n * amplitude * 1.03;
    }
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  if (settings.dust) for (let k = 0; k < 95; k++) {
    const x = hash2(k, 73, seed) * width, y = hash2(k, 92, seed) * height;
    const size = (.00045 + hash2(k, 18, seed) * .0011) * edge;
    addSpeck(data, width, height, x, y, Math.max(.65, size), settings.dust / 100 * (.24 + hash2(k, 91, seed) * .45), k % 3 !== 0);
  }
  if (settings.scratches) for (let k = 0; k < 14; k++) {
    addSpeck(data, width, height, hash2(k, 137, seed) * width, hash2(k, 138, seed) * height, Math.max(.8, edge * (.001 + hash2(k, 139, seed) * .002)), settings.scratches / 100 * .38, k % 4 !== 0, true);
  }
}

export function processPixels(data, width, height, state) {
  const a = state.adjustments || NEUTRAL;
  applyColors(data, state);
  renderFilm(data, width, height, state);
  details(data, width, height, { ...NEUTRAL.details, ...a.details });
  const textures = { ...NEUTRAL.analog, ...a.analog };
  if (Object.entries(textures).some(([key, value]) => key !== 'grainSize' && value)) analog(data, width, height, textures, state.seed ?? 41731);
  return data;
}
