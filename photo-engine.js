import { processPixels } from './processing.js';
import { createState, defaultComposition, clamp } from './model.js';
import { drawDecorations } from './decorations.js';
export { CAMERA_PROFILES } from './cameraProfiles/index.js';
import { frameGeometry, imagePlacement, drawPrint } from './filmEngine/format/index.js';
export const FRAMES = [
  { id: 'none', name: 'Sem moldura', color: '#eeeae0' },
  { id: 'manteiga', name: 'Manteiguinha', color: '#ffe18a' },
  { id: 'nuvens', name: 'Nas nuvens', color: '#dcecf0' },
  { id: 'polaroid', name: 'Retratinho', color: '#fffaf0' },
  { id: 'coracoes', name: 'Com amor', color: '#f7b8b3' },
];
export const LIMITS = Object.freeze({ fileBytes: 35 * 1024 * 1024, previewEdge: 1100, previewPixels: 1_210_000, exportEdge: 8192, exportPixels: 24_000_000 });
const caches = new Map();
let worker = null, workerFailed = false, jobId = 0;
const jobs = new Map();
const dimensions = image => ({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
const makeCanvas = (width, height) => { const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; return canvas; };
function context(canvas) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
  if (!ctx) throw new Error('O navegador não conseguiu reservar memória para esta imagem. Escolha uma dimensão menor.');
  return ctx;
}
function fit(width, height, maxEdge, maxPixels) {
  const scale = Math.min(1, maxEdge / Math.max(width, height), Math.sqrt(maxPixels / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image(); image.decoding = 'async';
    image.onload = () => image.naturalWidth ? resolve(image) : reject(new Error('Esta imagem parece estar vazia.'));
    image.onerror = () => reject(new Error('Não consegui abrir essa imagem. Tente JPG, PNG ou WebP.'));
    image.src = src;
  });
}
export async function preparePhoto(file) {
  if (!file?.size) throw new Error('Escolha uma foto para começar.');
  if (file.size > LIMITS.fileBytes) throw new Error('O limite de entrada é 35 MB por arquivo. Escolha uma cópia menor.');
  if (file.type && !file.type.startsWith('image/')) throw new Error('Escolha uma imagem JPG, PNG, WebP ou compatível com seu navegador.');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    // Keep the decoded original, including EXIF orientation. Never resize the source.
    return { image, file, name: file.name || 'minha-foto', ...dimensions(image) };
  } catch {
    throw new Error(/hei[cf]/i.test(file.type + file.name)
      ? 'Este navegador não abriu o HEIC/HEIF. Escolha uma cópia em JPEG ou PNG. O editor não inclui um conversor HEIC.'
      : 'Não consegui abrir essa foto. Tente outro arquivo ou uma cópia em JPG ou PNG.');
  } finally { URL.revokeObjectURL(url); }
}
export const createDemoPhoto = () => loadImage(new URL('./assets/demo.svg', import.meta.url).href);
export function getGeometry(image, state = {}) {
  const source = dimensions(image), c = { ...defaultComposition(), ...state.composition };
  const rotation = ((Math.round((c.rotation || 0) / 90) * 90 % 360) + 360) % 360;
  const swap = rotation === 90 || rotation === 270;
  const fullWidth = swap ? source.height : source.width, fullHeight = swap ? source.width : source.height;
  const crop = { ...defaultComposition().crop, ...c.crop };
  crop.width = clamp(crop.width, .03, 1); crop.height = clamp(crop.height, .03, 1);
  crop.x = clamp(crop.x, 0, 1 - crop.width); crop.y = clamp(crop.y, 0, 1 - crop.height);
  const format = frameGeometry(fullWidth, fullHeight, crop, state);
  return { fullWidth, fullHeight, ...format, rotation, straighten: clamp(c.straighten || 0, -15, 15), flipX: !!c.flipX, flipY: !!c.flipY, sourceWidth: source.width, sourceHeight: source.height };
}
export function getExportSize(image, state, options = {}) {
  const geometry = getGeometry(image, state), source = { width: geometry.width, height: geometry.height };
  const limited = source.width * source.height > LIMITS.exportPixels || Math.max(source.width, source.height) > LIMITS.exportEdge;
  if (options.original && limited) throw new Error('Esta composição supera o limite de 24 MP ou 8192 px por lado. O original está intacto; escolha “Máxima disponível” ou um tamanho menor.');
  let size;
  if (options.width || options.height) {
    let width = Number(options.width), height = Number(options.height);
    if (!width) width = Math.round(height * source.width / source.height);
    if (!height) height = Math.round(width * source.height / source.width);
    if (![width, height].every(value => Number.isFinite(value) && value >= 1 && Number.isInteger(value))) throw new Error('Informe dimensões inteiras maiores que zero.');
    if (width > source.width || height > source.height) throw new Error('Para preservar a qualidade, escolha dimensões até o tamanho original após o recorte.');
    if (Math.abs(width / height - source.width / source.height) > 1.5 / Math.min(height, source.height)) throw new Error('A largura e a altura precisam respeitar a proporção do recorte.');
    if (width * height > LIMITS.exportPixels || Math.max(width, height) > LIMITS.exportEdge) throw new Error('A exportação permite até 24 MP e 8192 px por lado. Reduza as dimensões.');
    size = { width, height };
  } else if (options.original) size = source;
  else size = fit(source.width, source.height, Math.min(options.maxEdge || LIMITS.exportEdge, LIMITS.exportEdge), Math.min(options.maxPixels || LIMITS.exportPixels, LIMITS.exportPixels));
  return { ...size, originalWidth: source.width, originalHeight: source.height, limited };
}
function rasterize(image, geometry, size) {
  const canvas = makeCanvas(size.width, size.height), ctx = context(canvas);
  const scaleX = size.width / (geometry.fullWidth * geometry.crop.width), scaleY = size.height / (geometry.fullHeight * geometry.crop.height);
  const rad = geometry.straighten * Math.PI / 180, cosine = Math.abs(Math.cos(rad)), sine = Math.abs(Math.sin(rad));
  const cover = Math.max(cosine + geometry.fullHeight / geometry.fullWidth * sine, cosine + geometry.fullWidth / geometry.fullHeight * sine);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.scale(scaleX, scaleY);
  ctx.translate(-geometry.crop.x * geometry.fullWidth, -geometry.crop.y * geometry.fullHeight);
  ctx.translate(geometry.fullWidth / 2, geometry.fullHeight / 2);
  ctx.rotate(rad);
  ctx.scale(geometry.flipX ? -cover : cover, geometry.flipY ? -cover : cover);
  ctx.rotate(geometry.rotation * Math.PI / 180);
  ctx.drawImage(image, -geometry.sourceWidth / 2, -geometry.sourceHeight / 2);
  ctx.resetTransform();
  return canvas;
}
function getWorker() {
  if (worker || workerFailed || typeof Worker === 'undefined') return worker;
  try {
    worker = new Worker(new URL('./processor-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const job = jobs.get(data.id); if (!job) return;
      jobs.delete(data.id);
      if (data.error) job.reject(new Error(data.error)); else job.resolve(new Uint8ClampedArray(data.buffer));
    };
    worker.onerror = () => {
      for (const job of jobs.values()) job.reject(new Error('O processamento foi interrompido. Tente novamente com uma dimensão menor.'));
      jobs.clear(); worker?.terminate(); worker = null; workerFailed = true;
    };
  } catch { workerFailed = true; }
  return worker;
}
async function process(imageData, state) {
  const target = getWorker();
  if (!target) return processPixels(imageData.data, imageData.width, imageData.height, state);
  return new Promise((resolve, reject) => {
    const id = ++jobId; jobs.set(id, { resolve, reject });
    target.postMessage({ id, buffer: imageData.data.buffer, width: imageData.width, height: imageData.height, state }, [imageData.data.buffer]);
  });
}
function recipeKey(state) { return JSON.stringify([state.camera, state.intensity, state.cameraTexture, state.cameraOptions, state.flash, state.formatBypass, state.adjustments, state.composition, state.seed]); }
export function clearRenderCache() { for (const entry of caches.values()) entry.canvas.width = entry.canvas.height = 1; caches.clear(); }
/** Identical pipeline for thumbnails, preview, 100% view and export. */
async function renderSize(canvas, image, state, assets, size, kind = '') {
  const geometry = getGeometry(image, state), innerSize = imagePlacement(geometry, size);
  const key = `${size.width}:${size.height}:${recipeKey(state)}`;
  const cached = caches.get(kind);
  let base = cached?.image === image && cached.key === key ? cached.canvas : null;
  if (!base) {
    base = rasterize(image, geometry, innerSize);
    const ctx = context(base), pixels = ctx.getImageData(0, 0, innerSize.width, innerSize.height);
    const result = await process(pixels, state);
    ctx.putImageData(new ImageData(result, innerSize.width, innerSize.height), 0, 0);
    if (kind && size.width * size.height <= 2_000_000) {
      if (cached) cached.canvas.width = cached.canvas.height = 1;
      caches.set(kind, { image, key, canvas: base });
    }
  }
  canvas.width = size.width; canvas.height = size.height;
  const ctx = context(canvas); drawPrint(ctx, base, geometry, size);
  drawDecorations(ctx, size.width, size.height, state, assets);
  if (caches.get(kind)?.canvas !== base) base.width = base.height = 1;
  return canvas;
}
export async function renderEditor(canvas, image, state = createState(), assets = new Map(), options = {}) {
  if (!image) return canvas;
  const geometry = getGeometry(image, state);
  const size = fit(geometry.width, geometry.height, options.maxEdge || LIMITS.previewEdge, options.maxPixels || LIMITS.previewPixels);
  return renderSize(canvas, image, state, assets, size, options.kind ?? 'preview');
}
export async function renderThumbnail(image, state, maxEdge = 150) {
  const canvas = makeCanvas(1, 1);
  await renderEditor(canvas, image, { ...state, frame: 'none', stickers: [], caption: '' }, new Map(), { maxEdge, maxPixels: maxEdge * maxEdge, kind: '' });
  const url = canvas.toDataURL('image/jpeg', .86); canvas.width = canvas.height = 1; return url;
}
export async function exportPhoto(image, state = createState(), assets = new Map(), options = {}) {
  if (!image) throw new Error('Escolha uma foto antes de exportar.');
  const size = getExportSize(image, state, options), canvas = makeCanvas(1, 1);
  const mime = options.format === 'jpeg' || options.format === 'jpg' ? 'image/jpeg' : 'image/png';
  try {
    await renderSize(canvas, image, state, assets, size);
    if (mime === 'image/jpeg') { const ctx = context(canvas); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = 'source-over'; }
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('O navegador ficou sem memória ao exportar. Escolha uma dimensão menor.')), mime, clamp(options.quality ?? .92, .4, 1));
    });
  } finally { canvas.width = canvas.height = 1; }
}
