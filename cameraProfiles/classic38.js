/** @satisfies {import('./CameraProfile').CameraProfile} */
export default {
  id: 'classic38', name: 'CLASSIC 38', description: 'Pele natural, luz suave e a delicadeza do negativo 35 mm.', color: '#bca570', format: { ratio: 1.5, autoOrient: true, label: '35 mm · 3:2' },
  exposure: { bias: 0, variation: .018, lowLightLoss: 0, latitude: 1.3 },
  tone: { contrast: 1.06, toe: .08, black: 0, shoulder: .72, white: .99 },
  colorResponse: { saturation: 1.01, skinProtection: .94, warmth: .009, shadow: [0, .001, .002], highlight: [.007, .002, -.003], bands: [[0,.05],[120,-.08],[235,-.015]] },
  grain: { model: 'negative', amount: .010, scale: 1900, coarse: .12, chroma: .08, shadowBoost: .25 },
  lens: { focal: 38, edgeSoftness: .00016, centerSoftness: .00003, microcontrast: .055, aberration: .000018, vignette: .06, distortion: .0002, field: .015 },
  highlights: { threshold: .87, bloom: .012, halation: .008, radius: .006 },
  flash: null, imperfections: { leakProbability: 0, leakAmount: 0, chemistry: 0 },
};
