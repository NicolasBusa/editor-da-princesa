import {blur,luma,smooth} from '../math.js';
export function highlightFields(pixels,w,h,profile) {
  const p=profile.highlights,mask=new Float32Array(w*h);
  for(let i=0,j=0;j<mask.length;i+=3,j++)mask[j]=smooth(p.threshold,1.03,luma(pixels[i],pixels[i+1],pixels[i+2]));
  return {mask,spread:blur(blur(mask,w,h,Math.min(w,h)*p.radius),w,h,Math.min(w,h)*p.radius*.7)};
}
export function applyBloom(pixels,fields,profile) {
  for(let j=0,i=0;j<fields.mask.length;j++,i+=3){const v=fields.spread[j]*profile.highlights.bloom;for(let c=0;c<3;c++)pixels[i+c]+=(1-pixels[i+c])*v;}
}
