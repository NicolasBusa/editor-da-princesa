import {clamp,luma,srgb,smooth} from '../math.js';
export function toneResponse(value,p) {
  let x=Math.max(0,srgb(value));
  // Contrast around middle gray, with a soft toe that keeps the black endpoint.
  if(x<1){const v=clamp(x,.000001,.999999);x=1/(1+((1-v)/v)**p.contrast);x+=p.toe*x*(1-smooth(.03,.42,x));}
  if(x>p.shoulder)x=p.shoulder+(p.white-p.shoulder)*(1-Math.exp(-(x-p.shoulder)/(p.white-p.shoulder)));
  return p.black+(1-p.black)*x;
}
export function applyTone(pixels,profile) {
  for(let i=0;i<pixels.length;i+=3){const l=luma(pixels[i],pixels[i+1],pixels[i+2]),target=toneResponse(l,profile.tone),encoded=srgb(l),ratio=encoded>1e-7?target/encoded:0;
    for(let c=0;c<3;c++)pixels[i+c]=encoded>1e-7?srgb(pixels[i+c])*ratio:profile.tone.black;
  }
}
