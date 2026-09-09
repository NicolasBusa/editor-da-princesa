/** @satisfies {import('./CameraProfile').CameraProfile} */
export default {
  id: 'flash800', name: 'FLASH 800', description: 'Cor espontânea, grão presente e flash frontal para estar perto.', color: '#d3a36a', format: { ratio: 1.5, autoOrient: true, label: '35 mm · 3:2' },
  exposure: { bias: -.035, variation: .025, lowLightLoss: .05, latitude: .75 },
  tone: { contrast: 1.19, toe: .025, black: 0, shoulder: .86, white: .998 },
  colorResponse: { saturation: 1.08, skinProtection: .78, warmth: .014, shadow: [.001,-.001,.001], highlight: [.009,.002,-.003], bands: [[0,.10],[115,.10],[235,.07]] },
  grain: { model: 'negative', amount: .025, scale: 950, coarse: .34, chroma: .22, shadowBoost: .65 },
  lens: { focal: 32, edgeSoftness: .0014, centerSoftness: .0001, microcontrast: -.035, aberration: .00022, vignette: .27, distortion: .002, field: .035 },
  highlights: { threshold: .86, bloom: .026, halation: .035, radius: .007 },
  flash: { ambientEV: -.95, energy: .48, referenceDistance: 2, backgroundDistance: 6.5, color: [1.018,1.007,.983] },
  imperfections: { leakProbability: 0, leakAmount: 0, chemistry: 0 },
};
