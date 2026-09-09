import {clamp,hash,luma,smooth} from '../math.js';
export function analyzeScene(data) {
  let sum=0,weight=0,dark=0;const stride=Math.max(1,Math.floor(data.length/4/50000))*4;
  for(let i=0;i<data.length;i+=stride){const a=data[i+3]/255,l=luma(data[i],data[i+1],data[i+2])/255;sum+=l*a;dark+=(l<.18?a:0);weight+=a;}
  const mean=sum/Math.max(1,weight);return {mean,darkFraction:dark/Math.max(1,weight),lowLight:1-smooth(.17,.44,mean)};
}
export function exposureEV(profile,scene,seed) {
  const p=profile.exposure;return p.bias+(hash(32,79,seed)*2-1)*p.variation*(.6+.4*scene.lowLight)-p.lowLightLoss*scene.lowLight/p.latitude;
}
export function expose(pixels,profile,scene,seed,compensation=0) {
  const gain=2**(exposureEV(profile,scene,seed)+clamp(compensation,-3,3));
  for(let i=0;i<pixels.length;i++)pixels[i]*=gain;
}
