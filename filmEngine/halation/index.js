export function applyHalation(pixels,fields,profile) {
  for(let j=0,i=0;j<fields.mask.length;j++,i+=3){const v=Math.max(0,fields.spread[j]-fields.mask[j]) * profile.highlights.halation;pixels[i]+=(1-pixels[i])*v;pixels[i+1]+=(1-pixels[i+1])*v*.23;}
}
