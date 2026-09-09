/** @satisfies {import('./CameraProfile').CameraProfile} */
export default {
  id: 'lomo32', name: 'LOMO 32', description: 'Cores seletivas, sombras densas e uma lente de personalidade.', color: '#869d82', format: { ratio: 1.5, autoOrient: true, label: '35 mm · 3:2' },
  exposure: { bias: 0, variation: .10, lowLightLoss: .015, latitude: .9 },
  tone: { contrast: 1.25, toe: .014, black: 0, shoulder: .82, white: .994 },
  colorResponse: { saturation: 1.02, skinProtection: .9, warmth: .003, shadow: [-.002,.002,.004], highlight: [.005,.003,-.002], bands: [[0,.28],[120,.34],[235,.27]] },
  grain: { model: 'negative', amount: .016, scale: 1350, coarse: .24, chroma: .13, shadowBoost: .4 },
  lens: { focal: 32, edgeSoftness: .0011, centerSoftness: .00003, microcontrast: .055, aberration: .00032, vignette: .60, distortion: .0035, field: .07 },
  highlights: { threshold: .85, bloom: .016, halation: .021, radius: .007 },
  flash: null, imperfections: { leakProbability: 0, leakAmount: 0, chemistry: 0 },
};
