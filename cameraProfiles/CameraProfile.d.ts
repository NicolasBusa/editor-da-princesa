/** Configuration contract for the single shared film engine. No LUT/asset fields. */
export interface CameraProfile {
  id: 'classic38' | 'flash800' | 'lomo32' | 'dream120' | 'instant160';
  name: string;
  description: string;
  color: string;
  format: { ratio: number; autoOrient: boolean; label: string; print?: { width: number; height: number; imageWidth: number; imageHeight: number; left: number; top: number } };
  exposure: { bias: number; variation: number; lowLightLoss: number; latitude: number };
  tone: { contrast: number; toe: number; black: number; shoulder: number; white: number };
  colorResponse: { saturation: number; skinProtection: number; warmth: number; shadow: [number, number, number]; highlight: [number, number, number]; bands: [number, number][]; separation?: number };
  grain: { model: 'negative' | 'chemical'; amount: number; scale: number; coarse: number; chroma: number; shadowBoost: number };
  lens: { focal: number; edgeSoftness: number; centerSoftness: number; microcontrast: number; aberration: number; vignette: number; distortion: number; field: number };
  highlights: { threshold: number; bloom: number; halation: number; radius: number };
  flash: null | { ambientEV: number; energy: number; referenceDistance: number; backgroundDistance: number; color: [number, number, number] };
  imperfections: { leakProbability: number; leakAmount: number; chemistry: number };
}
