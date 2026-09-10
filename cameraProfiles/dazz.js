const format35 = { ratio: 3 / 2, autoOrient: true, label: 'Filme · 35 mm' };
const format43 = { ratio: 4 / 3, autoOrient: true, label: 'Digital · 4:3' };
const instantPortrait = {
  ratio: 3 / 4,
  autoOrient: false,
  label: 'Instantâneo · 3:4',
  print: { width: 88, height: 118, imageWidth: 77, imageHeight: 102.667, left: 5.5, top: 5.5 },
};
const instantSquare = {
  ratio: 1,
  autoOrient: false,
  label: 'Instantâneo · 1:1',
  print: { width: 88, height: 107, imageWidth: 77, imageHeight: 77, left: 5.5, top: 5.5 },
};

const CAMERA_SOURCES = [
  {
    id: 'bw_classic', name: 'B&W CLASSIC', category: 'film', description: 'Preto e branco clássico, contraste firme e grão inspirado em Tri-X 400.', color: '#77736d', thumbnail: './assets/camera-icons/bw_classic.jpg', format: format35, focal: 35,
    look: { exposure: -.16, contrast: 1.42, saturation: 0, temperature: 0, tint: 0, whites: -16, blacks: -20, grain: .30, grainSize: 2.1, grainRoughness: .66, grainLumaBias: .74, grainColor: 0, vignette: .10, distortion: 0, aberration: 0, bloom: 0, halation: 0, rolloff: .24, pivot: .62, edgeFalloff: .07, softness: .018, chemistry: .05, variation: .008, fade: 0, shadow: [0,0,0], highlight: [0,0,0], monochrome: [.24,.68,.08], bands: [] },
  },
  {
    id: 'ccd_r', name: 'CCD R', category: 'ccd', description: 'CCD dos anos 2000, sombras frias, azul esverdeado e ruído digital delicado.', color: '#7b9fb8', thumbnail: './assets/camera-icons/ccd_r.jpg', format: format43, focal: 35,
    look: { exposure: 0, contrast: 1.08, saturation: .92, vibrance: -6, temperature: -20, tint: -7, whites: -6, blacks: -22, grain: .075, grainSize: .95, grainRoughness: .42, grainLumaBias: .40, grainColor: .045, vignette: .12, distortion: 0, aberration: .18, bloom: .004, halation: .006, rolloff: .14, pivot: .62, edgeFalloff: .04, softness: .012, chemistry: .03, variation: .048, fade: .03, shadow: [.01,-.01,.02], highlight: [.024,.016,-.01], bands: [[120,.08],[205,.09],[235,.08]] },
  },
  {
    id: 'cpm35', name: 'CPM35', category: 'film', description: 'Negativo de 35 mm quente, dourado suave e tons de pele protegidos.', color: '#c49a62', thumbnail: './assets/camera-icons/cpm35.jpg', format: format35, focal: 35,
    look: { exposure: 0, contrast: 1.10, saturation: .97, vibrance: -2, temperature: 14, tint: 1, whites: -12, blacks: -18, grain: .14, grainSize: 1.25, grainRoughness: .50, grainLumaBias: .62, grainColor: .05, vignette: .09, distortion: .01, aberration: .075, bloom: .003, halation: .006, rolloff: .18, pivot: .64, edgeFalloff: .055, softness: .005, chemistry: .032, variation: .02, fade: .014, shadow: [.02,.018,.012], highlight: [.034,.014,-.004], bands: [[28,.09],[55,.08],[215,-.05]] },
  },
  {
    id: 'd_classic', name: 'D CLASSIC', category: 'digital', description: 'Digital clássico de 38 mm, definição limpa e contraste equilibrado.', color: '#8c918c', thumbnail: './assets/camera-icons/d_classic.jpg', format: format43, focal: 38,
    look: { exposure: 0, contrast: 1.14, saturation: .98, temperature: 4, tint: -1, whites: -8, blacks: -15, grain: .09, grainSize: .95, grainRoughness: .30, grainLumaBias: .48, grainColor: .02, vignette: .11, distortion: 0, aberration: .01, bloom: .0015, halation: 0, rolloff: .14, pivot: .67, edgeFalloff: .025, softness: .002, chemistry: .006, variation: .012, fade: .018, shadow: [0,.004,.014], highlight: [.008,.004,0], bands: [[205,.025]] },
  },
  {
    id: 'fisheye', name: 'FISHEYE', category: 'creative', description: 'Olho de peixe quadrado, distorção marcante, vinheta forte e cor retrô.', color: '#5f7885', thumbnail: './assets/camera-icons/fisheye.jpg', format: { ratio: 1, autoOrient: false, label: 'Olho de peixe · 1:1' }, focal: 10,
    look: { exposure: 0, contrast: 1.10, saturation: 1.04, vibrance: 5, temperature: 10, tint: 8, whites: -14, blacks: -22, grain: .16, grainSize: 1.55, grainRoughness: .52, grainLumaBias: .58, grainColor: .075, vignette: .48, distortion: .72, aberration: .12, bloom: .02, halation: .02, rolloff: .13, pivot: .64, edgeFalloff: .085, softness: .016, chemistry: .03, variation: .04, fade: .02, shadow: [0,.01,.025], highlight: [.018,.012,0], bands: [[28,.08],[250,.09]] },
  },
  {
    id: 'fqs', name: 'FQS', category: 'film', description: 'Filme Fuji frio, verdes suaves e realces discretamente azulados.', color: '#73a08e', thumbnail: './assets/camera-icons/fqs.jpg', format: format35, focal: 35,
    look: { exposure: 0, contrast: 1.18, saturation: .82, vibrance: -8, temperature: -26, tint: -14, whites: -16, blacks: -24, grain: .145, grainSize: 1.45, grainRoughness: .48, grainLumaBias: .58, grainColor: .045, vignette: .11, distortion: 0, aberration: .12, bloom: .002, halation: .004, rolloff: .14, pivot: .62, edgeFalloff: .05, softness: .001, chemistry: .03, variation: .024, fade: .014, shadow: [-.006,.018,.028], highlight: [-.012,.014,.024], bands: [[120,.14],[180,.08],[28,-.08]] },
  },
  {
    id: 'fxn_r', name: 'FXN-R', category: 'film', description: 'Negativo frio e sóbrio, sombras ciano e detalhes bem definidos.', color: '#698f94', thumbnail: './assets/camera-icons/fxn_r.jpg', format: format35, focal: 35,
    look: { exposure: 0, contrast: 1.14, saturation: .95, vibrance: -1, temperature: -30, tint: -5, whites: -10, blacks: -14, grain: .12, grainSize: 1.15, grainRoughness: .38, grainLumaBias: .60, grainColor: .04, vignette: .09, distortion: .01, aberration: .08, bloom: .004, halation: .006, rolloff: .17, pivot: .66, edgeFalloff: .052, softness: .004, chemistry: .018, variation: .03, fade: .014, shadow: [0,.016,.028], highlight: [.004,.01,.007], bands: [[180,.08],[220,.06],[28,-.035]] },
  },
  {
    id: 'grd_r', name: 'GRD R', category: 'digital', description: 'Compacta de rua em 28 mm, baixa saturação, textura seca e alta nitidez.', color: '#777c76', thumbnail: './assets/camera-icons/grd_r.jpg', format: format43, focal: 28,
    look: { exposure: -.03, contrast: 1.08, saturation: .78, temperature: -4, tint: 0, whites: 2, blacks: -10, grain: .11, grainSize: .90, grainRoughness: .30, grainLumaBias: .48, grainColor: 0, vignette: .14, distortion: 0, aberration: .04, bloom: 0, halation: 0, rolloff: .08, pivot: .68, edgeFalloff: .05, softness: 0, chemistry: 0, variation: .018, fade: .004, shadow: [0,.006,.016], highlight: [.005,.008,.006], bands: [[0,-.08],[120,-.04],[235,-.08]] },
  },
  {
    id: 'inst_c', name: 'INST C', category: 'instant', description: 'Instantâneo 3:4 de papel quente, meios-tons cremosos e borda clássica.', color: '#d2b38d', thumbnail: './assets/camera-icons/inst_c.png', format: instantPortrait, focal: 60,
    look: { exposure: 0, contrast: 1.03, saturation: .99, vibrance: 3, temperature: 13, tint: 5, whites: -10, blacks: -15, grain: .115, grainSize: 1.75, grainRoughness: .34, grainLumaBias: .54, grainColor: .018, vignette: .07, distortion: 0, aberration: .065, bloom: .004, halation: .002, rolloff: .20, pivot: .64, edgeFalloff: .072, softness: .001, chemistry: .034, variation: .046, fade: .016, shadow: [.042,.014,.008], highlight: [.03,.012,-.004], bands: [[28,.07],[50,.04],[220,-.05]] },
  },
  {
    id: 'inst_sqc', name: 'INST SQC', category: 'instant', description: 'Instantâneo quadrado, calor suave, papel aparente e revelação delicada.', color: '#d5b991', thumbnail: './assets/camera-icons/inst_sqc.png', format: instantSquare, focal: 35,
    look: { exposure: 0, contrast: 1.02, saturation: 1, vibrance: 3, temperature: 18, tint: .8, whites: -10, blacks: -14, grain: .12, grainSize: 1.8, grainRoughness: .33, grainLumaBias: .52, grainColor: .014, vignette: .08, distortion: 0, aberration: .04, bloom: .004, halation: .002, rolloff: .18, pivot: .63, edgeFalloff: .075, softness: .001, chemistry: .038, variation: .048, fade: .013, shadow: [.044,.012,.012], highlight: [.022,.01,-.003], bands: [[28,.075],[55,.05],[220,-.04]] },
  },
  {
    id: 'u300', name: 'U300', category: 'film', description: 'Filme colorido quente, dourados vivos, contraste médio e grão fino.', color: '#c08f55', thumbnail: './assets/camera-icons/u300.jpg', format: format35, focal: 32,
    look: { exposure: 0, contrast: 1.12, saturation: 1.06, vibrance: 2, temperature: 20, tint: 2, whites: -14, blacks: -18, grain: .11, grainSize: 1.55, grainRoughness: .34, grainLumaBias: .50, grainColor: .05, vignette: .14, distortion: .005, aberration: .05, bloom: .0038, halation: .0032, rolloff: .12, pivot: .64, edgeFalloff: .075, softness: 0, chemistry: .032, variation: .05, fade: .008, shadow: [.04,.015,0], highlight: [.02,.012,0], bands: [[28,.12],[55,.11],[210,-.04]] },
  },
];

const channelShift = (look, highlight = false) => {
  const source = highlight ? look.highlight : look.shadow;
  const warmth = (look.temperature || 0) * .00042;
  const tint = (look.tint || 0) * .00032;
  return [source[0] + warmth + tint, source[1] - tint * 1.25, source[2] - warmth + tint * .45];
};

function adapt(source) {
  const p = source.look;
  return {
    id: source.id,
    name: source.name,
    category: source.category,
    description: source.description,
    color: source.color,
    thumbnail: source.thumbnail,
    format: source.format,
    exposure: { bias: p.exposure || 0, variation: p.variation || 0, lowLightLoss: source.category === 'instant' ? .2 : source.category === 'ccd' ? .08 : 0, latitude: source.category === 'ccd' ? .78 : source.category === 'instant' ? .72 : 1.05 },
    tone: { contrast: p.contrast, toe: Math.max(0, (-p.blacks || 0) / 520), black: p.fade * .18, shoulder: p.pivot, white: Math.max(p.pivot + .08, 1 + (p.whites || 0) / 250) },
    colorResponse: { saturation: p.saturation * (1 + (p.vibrance || 0) / 220), skinProtection: source.category === 'creative' ? .70 : source.category === 'digital' || source.category === 'ccd' ? .82 : .92, warmth: (p.temperature || 0) * .00028, shadow: channelShift(p), highlight: channelShift(p, true), bands: p.bands, monochrome: p.monochrome },
    grain: { model: source.category === 'instant' ? 'chemical' : 'negative', amount: p.grain * .105, scale: 2200 / Math.max(.7, p.grainSize), coarse: p.grainRoughness, chroma: Math.min(.3, p.grainColor * 3), shadowBoost: p.grainLumaBias },
    lens: { focal: source.focal, edgeSoftness: .00012 + p.softness * .045, centerSoftness: p.softness * .006, microcontrast: source.id === 'grd_r' ? .10 : source.id === 'fisheye' ? -.04 : .025, aberration: p.aberration * .0032, vignette: p.vignette, distortion: source.id === 'fisheye' ? .145 : p.distortion * .35, field: Math.max(.01, p.edgeFalloff) },
    highlights: { threshold: p.pivot + .13, bloom: p.bloom * 2, halation: p.halation * 3, radius: source.category === 'instant' ? .009 : .006 },
    flash: null,
    imperfections: { leakProbability: p.fade > .02 ? .18 : 0, leakAmount: p.fade * 1.7, chemistry: p.monochrome ? 0 : p.chemistry },
    provenance: { source: 'DAZZ Retro Camera', mode: 'post-processing', sourceId: source.id },
  };
}

export default CAMERA_SOURCES.map(adapt);
