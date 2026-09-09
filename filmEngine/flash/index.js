import {clamp,linear,luma,skinWeight,smooth} from '../math.js';
export function flashContribution(nx,ny,r,g,b,settings,model) {
  const cx=clamp(settings.x??.5,.1,.9),cy=clamp(settings.y??.45,.1,.9);
  // An anisotropic portrait footprint modulated by skin/chroma and luminance.
  // This is a spatial depth approximation, not inferred geometry or segmentation.
  const dx=(nx-cx)/.28,dy=(ny-cy)/.43,footprint=Math.exp(-(dx**4+dy**4)*1.6);
  const salience=.50+.32*skinWeight(r,g,b)+.18*smooth(.035,.38,luma(r,g,b));
  const foreground=clamp(footprint*salience*1.45);
  const distance=clamp(settings.distance??2,1.2,3.5),z=distance+(model.backgroundDistance-distance)*(1-foreground);
  return model.energy*clamp((settings.power??75)/100)*(model.referenceDistance/z)**2;
}
export function applyFlash(pixels,source,w,h,profile,settings={}) {
  if(!profile.flash||!settings.enabled||settings.power===0)return;
  const m=profile.flash,ambient=2**m.ambientEV;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*4,j=(y*w+x)*3;if(!source[i+3])continue;
    const r=source[i]/255,g=source[i+1]/255,b=source[i+2]/255;
    const energy=flashContribution((x+.5)/w,(y+.5)/h,r,g,b,settings,m);
    // Estimated reflectance retains hue and leaves black pixels black; adding a
    // constant white floor would create an obvious radial haze over a night sky.
    for(let c=0;c<3;c++)pixels[j+c]=pixels[j+c]*ambient+energy*1.8*(linear(source[i+c]/255)**.65)*m.color[c];
  }
}
