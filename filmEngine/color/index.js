import {clamp,hash,luma,skinWeight,smooth} from '../math.js';
export function applyColor(pixels,profile,scene,seed) {
  const p=profile.colorResponse,variation=(hash(64,9,seed)-.5)*profile.imperfections.chemistry;
  for(let i=0;i<pixels.length;i+=3){let r=pixels[i],g=pixels[i+1],b=pixels[i+2];if(p.monochrome){const gray=r*p.monochrome[0]+g*p.monochrome[1]+b*p.monochrome[2];r=g=b=gray;}const l=luma(r,g,b),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
    let hue=0;if(d>1e-7){hue=max===r?((g-b)/d+(g<b?6:0)):max===g?(b-r)/d+2:(r-g)/d+4;hue*=60;}
    const protect=skinWeight(r,g,b)*p.skinProtection,mid=smooth(.025,.24,l)*(1-smooth(.65,1.02,l));
    let selective=0;for(const [center,strength] of p.bands){const distance=Math.min(Math.abs(hue-center),360-Math.abs(hue-center));selective+=strength*Math.exp(-((distance/43)**2));}
    const sat=1+(p.saturation-1+selective*mid*(1-.2*scene.lowLight))*(1-protect*.82);
    r=l+(r-l)*sat;g=l+(g-l)*sat;b=l+(b-l)*sat;
    const sh=1-smooth(.07,.52,l),hi=smooth(.55,.95,l),warm=p.warmth*Math.sin(Math.PI*clamp(l))*(1-protect*.8);
    const separation=p.separation||0;const channels=[r,g,b];
    for(let c=0;c<3;c++){const dye=channels[c]*(1-separation)+(channels[(c+1)%3]*.65+channels[(c+2)%3]*.35)*separation;
      pixels[i+c]=dye+(p.shadow[c]*sh+p.highlight[c]*hi)*(1-protect*.45)+(c===0?warm+variation:c===2?-warm-variation:0);
    }
  }
}
