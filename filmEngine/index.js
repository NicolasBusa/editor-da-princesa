import {getCameraProfile} from '../cameraProfiles/index.js';
import {clamp} from './math.js';
import {analyzeScene,expose} from './exposure/index.js';
import {applyLens} from './lens/index.js';
import {applyFlash} from './flash/index.js';
import {applyTone} from './tone/index.js';
import {applyColor} from './color/index.js';
import {highlightFields,applyBloom} from './bloom/index.js';
import {applyHalation} from './halation/index.js';
import {addTexture} from './grain/index.js';
import {writeOutput} from './output/index.js';

/** Shared camera simulation; input/output sRGB bytes, optical exposure in linear light. */
export function renderFilm(data,width,height,state) {
  const amount=clamp((state.intensity??100)/100);if(!amount)return data;
  const profile=getCameraProfile(state.camera),options=state.cameraOptions||{},seed=state.seed??41731;
  const scene=analyzeScene(data),pixels=applyLens(data,width,height,profile,seed,options.lens!==false);
  expose(pixels,profile,scene,seed);
  applyFlash(pixels,data,width,height,profile,state.flash);
  // Scatter is driven by scene light before print tone compression.
  const fields=highlightFields(pixels,width,height,profile);
  applyTone(pixels,profile);applyColor(pixels,profile,scene,seed);
  applyBloom(pixels,fields,profile);applyHalation(pixels,fields,profile);
  addTexture(pixels,width,height,profile,scene,seed,options,clamp((state.cameraTexture??100)/100));
  return writeOutput(data,pixels,amount);
}
