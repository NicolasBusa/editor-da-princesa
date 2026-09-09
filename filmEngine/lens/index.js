import {clamp,linear,hash} from '../math.js';
// Five-tap radial PSF with separate radial/tangential spread; never a uniform blur.
function sample(data,w,h,x,y,c) {
  x=clamp(x,0,w-1);y=clamp(y,0,h-1);const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(w-1,x0+1),y1=Math.min(h-1,y0+1),tx=x-x0,ty=y-y0;
  const ids=[(y0*w+x0)*4,(y0*w+x1)*4,(y1*w+x0)*4,(y1*w+x1)*4],weights=[(1-tx)*(1-ty),tx*(1-ty),(1-tx)*ty,tx*ty];let sum=0,a=0;
  for(let j=0;j<4;j++){const weight=weights[j]*data[ids[j]+3]/255;sum+=data[ids[j]+c]*weight;a+=weight;}return a?sum/a/255:0;
}
export function opticalField(nx,ny,p,seed) {
  const dx=(nx-.5)*2,dy=(ny-.5)*2,r2=(dx*dx+dy*dy)/2;
  const asymmetry=1+p.field*(hash(7,31,seed)-.5)*dx*dy;
  return {dx,dy,r2,softness:(p.centerSoftness+p.edgeSoftness*r2*r2)*asymmetry,transmission:(1+p.vignette*r2*1.35)**-2};
}
export function applyLens(data,w,h,profile,seed,enabled=true) {
  const out=new Float32Array(w*h*3),p=profile.lens,edge=Math.min(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const j=(y*w+x)*3,i=(y*w+x)*4;
    if(!data[i+3])continue;
    if(!enabled){for(let c=0;c<3;c++)out[j+c]=linear(data[i+c]/255);continue;}
    const field=opticalField((x+.5)/w,(y+.5)/h,p,seed),r=Math.sqrt(field.r2*2)||1,ux=field.dx/r,uy=field.dy/r;
    const sx=x+field.dx*p.distortion*field.r2*w,sy=y+field.dy*p.distortion*field.r2*h;
    const spread=field.softness*edge,ca=p.aberration*field.r2*edge;
    for(let c=0;c<3;c++){
      const shift=(c-1)*ca,cx=sx+ux*shift,cy=sy+uy*shift;
      const center=sample(data,w,h,cx,cy,c);
      const ring=(sample(data,w,h,cx+ux*spread,cy+uy*spread,c)+sample(data,w,h,cx-ux*spread,cy-uy*spread,c)+sample(data,w,h,cx-uy*spread*.7,cy+ux*spread*.7,c)+sample(data,w,h,cx+uy*spread*.7,cy-ux*spread*.7,c))/4;
      const optical=center*.36+ring*.64;
      const micro=(sample(data,w,h,cx-1,cy,c)+sample(data,w,h,cx+1,cy,c)+sample(data,w,h,cx,cy-1,c)+sample(data,w,h,cx,cy+1,c))/4;
      out[j+c]=linear(clamp(optical+(center-micro)*p.microcontrast))*field.transmission;
    }
  }return out;
}
