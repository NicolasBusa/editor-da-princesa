import {clamp,mix} from '../math.js';
export function writeOutput(data,pixels,intensity) {
  for(let i=0,j=0;i<data.length;i+=4,j+=3){if(!data[i+3])continue;
    // Compress out-of-gamut chroma towards luminance rather than clip channels.
    let r=pixels[j],g=pixels[j+1],b=pixels[j+2],l=clamp(r*.2126+g*.7152+b*.0722),scale=1;
    for(const v of [r,g,b]){if(v>1&&v!==l)scale=Math.min(scale,(1-l)/(v-l));if(v<0&&v!==l)scale=Math.min(scale,-l/(v-l));}
    for(let c=0;c<3;c++)data[i+c]=mix(data[i+c],clamp(l+(pixels[j+c]-l)*scale)*255,intensity);
  }return data;
}
