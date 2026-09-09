/** @satisfies {import('./CameraProfile').CameraProfile} */
export default {
  id: 'instant160', name: 'INSTANT 160', description: 'Meios-tons macios e cor de papel recém-revelado, com ou sem borda.', color: '#c5ac99',
  format: { ratio: 77/79, autoOrient: false, label: 'Instantâneo · 77:79', print: { width: 88, height: 107, imageWidth: 77, imageHeight: 79, left: 5.5, top: 5.5 } },
  exposure: { bias: -.02, variation: .035, lowLightLoss: .55, latitude: .7 },
  tone: { contrast: 1.13, toe: .025, black: .025, shoulder: .59, white: .955 },
  colorResponse: { saturation: .88, skinProtection: .72, warmth: 0, shadow: [.008,.005,-.004], highlight: [.014,.008,-.006], bands: [[0,-.03],[120,-.17],[235,-.11]], separation: .055 },
  grain: { model: 'chemical', amount: .010, scale: 2300, coarse: .12, chroma: .12, shadowBoost: .1 },
  lens: { focal: 116, edgeSoftness: .00065, centerSoftness: .00022, microcontrast: -.12, aberration: .00004, vignette: .13, distortion: .0003, field: .02 },
  highlights: { threshold: .77, bloom: .040, halation: .009, radius: .009 },
  flash: null, imperfections: { leakProbability: 0, leakAmount: 0, chemistry: .012 },
};
