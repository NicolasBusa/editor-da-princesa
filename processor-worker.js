import { processPixels } from './processing.js';
self.onmessage = ({ data }) => {
  const { id, buffer, width, height, state } = data;
  try {
    const pixels = processPixels(new Uint8ClampedArray(buffer), width, height, state);
    self.postMessage({ id, buffer: pixels.buffer }, [pixels.buffer]);
  } catch (error) { self.postMessage({ id, error: error.message || 'Não foi possível processar esta foto.' }); }
};
