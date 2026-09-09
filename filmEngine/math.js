export const clamp = (x,a=0,b=1) => Math.min(b,Math.max(a,x));
export const mix = (a,b,t) => a+(b-a)*t;
export const smooth = (a,b,x) => { const t=clamp((x-a)/(b-a));return t*t*(3-2*t); };
export const luma = (r,g,b) => r*.2126+g*.7152+b*.0722;
export const linear = x => x<=.04045 ? x/12.92 : ((x+.055)/1.055)**2.4;
export const srgb = x => x<=.0031308 ? x*12.92 : 1.055*Math.max(0,x)**(1/2.4)-.055;
export function hash(x,y,seed) { let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^(seed|0);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295; }
export function noise(x,y,seed) { const ix=Math.floor(x),iy=Math.floor(y),u=smooth(0,1,x-ix),v=smooth(0,1,y-iy);return mix(mix(hash(ix,iy,seed),hash(ix+1,iy,seed),u),mix(hash(ix,iy+1,seed),hash(ix+1,iy+1,seed),u),v)*2-1; }
export function blur(field,w,h,radius) {
  const r=Math.max(1,Math.round(radius)),n=2*r+1,tmp=new Float32Array(field.length),out=new Float32Array(field.length);
  for(let y=0;y<h;y++){const row=y*w;let sum=0;for(let k=-r;k<=r;k++)sum+=field[row+clamp(k,0,w-1)];for(let x=0;x<w;x++){tmp[row+x]=sum/n;sum+=field[row+Math.min(w-1,x+r+1)]-field[row+Math.max(0,x-r)];}}
  for(let x=0;x<w;x++){let sum=0;for(let k=-r;k<=r;k++)sum+=tmp[clamp(k,0,h-1)*w+x];for(let y=0;y<h;y++){out[y*w+x]=sum/n;sum+=tmp[Math.min(h-1,y+r+1)*w+x]-tmp[Math.max(0,y-r)*w+x];}}
  return out;
}
export function skinWeight(r,g,b) {
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  if(d<.015)return 0;
  let hue=max===r?((g-b)/d+(g<b?6:0)):max===g?(b-r)/d+2:(r-g)/d+4;hue*=60;
  return Math.exp(-(((hue-28)/28)**2))*smooth(.03,.12,d)*(1-smooth(.65,.95,d));
}
