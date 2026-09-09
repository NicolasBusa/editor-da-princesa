/** Serializable, non-destructive editing recipe. No image pixels live in history. */
export const HSL_BANDS = [
  ['red', 'Vermelho', 0, '#cb6860'], ['orange', 'Laranja', 30, '#d79c63'],
  ['yellow', 'Amarelo', 60, '#d6bd5b'], ['green', 'Verde', 120, '#80a87b'],
  ['aqua', 'Água', 180, '#75b4b0'], ['blue', 'Azul', 240, '#7396bb'],
  ['purple', 'Roxo', 275, '#a187bd'], ['magenta', 'Magenta', 315, '#bf88a9'],
];
export const GROUPS = [
  { id: 'light', name: 'Luz', description: 'Do primeiro raio às sombras mais delicadas.', controls: [
    ['exposure', 'Exposição', -3, 3, 0.05, 0, 'EV', 'Multiplica a luz em espaço linear, como uma compensação de exposição.'],
    ['brightness', 'Brilho', -100, 100, 1, 0, '', 'Ilumina principalmente os meios-tons, preservando os extremos.'],
    ['contrast', 'Contraste', -100, 100, 1, 0, '', 'Aproxima ou afasta as luminosidades, com transições suaves.'],
    ['highlights', 'Realces', -100, 100, 1, 0, '', 'Ajusta as regiões claras sem deslocar igualmente as sombras.'],
    ['shadows', 'Sombras', -100, 100, 1, 0, '', 'Revela ou aprofunda as áreas escuras.'],
    ['whites', 'Brancos', -100, 100, 1, 0, '', 'Controla a parte mais luminosa da imagem.'],
    ['blacks', 'Pretos', -100, 100, 1, 0, '', 'Define a profundidade dos tons mais escuros.'],
  ] },
  { id: 'color', name: 'Cor', description: 'Encontre o equilíbrio que combina com a lembrança.', controls: [
    ['temperature', 'Temperatura', -100, 100, 1, 0, '', 'Equilíbrio azul–âmbar; valores positivos aquecem a foto.'],
    ['tint', 'Verde–magenta', -100, 100, 1, 0, '', 'Corrige o eixo verde–magenta sem girar todas as cores.'],
    ['hue', 'Matiz global', -180, 180, 1, 0, '°', 'Gira todas as cores ao redor do círculo cromático.'],
    ['saturation', 'Saturação', -100, 100, 1, 0, '', 'Altera a intensidade de todas as cores.'],
    ['vibrance', 'Vibrância', -100, 100, 1, 0, '', 'Prioriza cores discretas e reduz a intervenção em tons de pele.'],
  ] },
  { id: 'details', name: 'Detalhes', description: 'Acabamento gradual, sem exagerar nas bordas.', controls: [
    ['sharpness', 'Nitidez', 0, 100, 1, 0, '', 'Realça bordas finas com limiar para poupar áreas lisas.'],
    ['texture', 'Textura', -100, 100, 1, 0, '', 'Suaviza ou destaca detalhes de pequena escala.'],
    ['clarity', 'Claridade', -100, 100, 1, 0, '', 'Ajusta o contraste local em uma escala mais ampla.'],
    ['denoise', 'Redução de ruído', 0, 100, 1, 0, '', 'Suavização orientada pela diferença de cor para preservar bordas.'],
  ] },
  { id: 'analog', name: 'Efeitos analógicos', description: 'Texturas fixas: cada ajuste mantém o mesmo desenho.', controls: [
    ['grain', 'Quantidade do grão', 0, 100, 1, 0, '', 'Grão orgânico, mais presente nos meios-tons.'],
    ['grainSize', 'Tamanho do grão', 0.5, 5, 0.1, 1.5, '', 'Escala do grão manual; a câmera mantém sua própria estrutura de grão.'],
    ['vignette', 'Vinheta', 0, 100, 1, 0, '', 'Escurecimento gradual próximo às bordas.'],
    ['fade', 'Desbotamento', 0, 100, 1, 0, '', 'Levanta os pretos e comprime suavemente os brancos.'],
    ['bloom', 'Bloom', 0, 100, 1, 0, '', 'Difusão luminosa baseada somente nas regiões brilhantes.'],
    ['halation', 'Halation', 0, 100, 1, 0, '', 'Halo âmbar ao redor de realces intensos, sem tingir toda a foto.'],
    ['lightLeaks', 'Vazamento de luz', 0, 100, 1, 0, '', 'Um véu quente e localizado que entra pela borda.'],
    ['dust', 'Poeira', 0, 100, 1, 0, '', 'Pontos e pequenas marcas de emulsão, sempre nas mesmas posições.'],
    ['scratches', 'Riscos', 0, 100, 1, 0, '', 'Traços finos de desgaste, opcionais e graduais.'],
  ] },
];

export function defaultAdjustments() {
  const result = Object.fromEntries(GROUPS.map(group => [group.id, Object.fromEntries(group.controls.map(control => [control[0], control[5]]))]));
  result.hsl = Object.fromEntries(HSL_BANDS.map(([id]) => [id, { hue: 0, saturation: 0, luminance: 0 }]));
  result.curves = Object.fromEntries(['rgb', 'red', 'green', 'blue'].map(id => [id, [0, 0.25, 0.5, 0.75, 1]]));
  result.grading = Object.fromEntries(['shadows', 'midtones', 'highlights'].map(id => [id, { hue: 35, saturation: 0, luminance: 0 }]));
  return result;
}
export const defaultComposition = () => ({ rotation: 0, straighten: 0, flipX: false, flipY: false, ratio: 'free', crop: { x: 0, y: 0, width: 1, height: 1 } });
export function createState() {
  return { camera: 'classic38', intensity: 100, cameraTexture: 100, cameraOptions: { grain: true, frame: true, lightLeaks: true, lens: true }, flash: { enabled: false, power: 75, distance: 2, x: .5, y: .45 }, adjustments: defaultAdjustments(), composition: defaultComposition(), frame: 'none', stickers: [], caption: '', seed: 41731 };
}
export function neutralPhotoState(state, keepComposition = true) {
  return { ...createState(), camera: state.camera, cameraOptions: { ...state.cameraOptions }, intensity: 0, composition: keepComposition ? JSON.parse(JSON.stringify(state.composition || defaultComposition())) : defaultComposition(), seed: state.seed || 41731 };
}
export const clone = value => JSON.parse(JSON.stringify(value));
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function captureSeed() { const seed = new Uint32Array(1); if (globalThis.crypto?.getRandomValues) { globalThis.crypto.getRandomValues(seed); return seed[0]; } return Math.floor(Math.random()*4294967296); }
