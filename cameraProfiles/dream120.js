/** @satisfies {import('./CameraProfile').CameraProfile} */
export default {
  id: 'dream120', name: 'DREAM 120', description: 'Um quadrado de luz, centro delicado e cantos de sonho.', color: '#b0a8bf', format: { ratio: 1, autoOrient: false, label: '120 · 1:1' },
  exposure: { bias: .035, variation: .05, lowLightLoss: 0, latitude: 1.45 },
  tone: { contrast: 1.01, toe: .10, black: .003, shoulder: .69, white: .985 },
  colorResponse: { saturation: .98, skinProtection: .9, warmth: .005, shadow: [0,.002,.003], highlight: [.005,.002,-.002], bands: [[120,-.035],[235,-.025]] },
  grain: { model: 'negative', amount: .011, scale: 2100, coarse: .15, chroma: .10, shadowBoost: .25 },
  lens: { focal: 60, edgeSoftness: .0055, centerSoftness: .00012, microcontrast: -.14, aberration: .00075, vignette: .72, distortion: .009, field: .13 },
  highlights: { threshold: .79, bloom: .070, halation: .014, radius: .012 },
  flash: null, imperfections: { leakProbability: .12, leakAmount: .19, chemistry: 0 },
};
