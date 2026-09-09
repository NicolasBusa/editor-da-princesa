import {clamp,hash,luma,noise,smooth} from '../math.js';
export const hasLightLeak = (profile,seed) => hash(813,71,seed)<profile.imperfections.leakProbability;
export function addTexture(pixels,w,h,profile,scene,seed,options,strength) {
  const p=profile.grain,grain=options.grain!==false?strength:0,chem=profile.imperfections.chemistry*grain;
  const leak=options.lightLeaks!==false&&hasLightLeak(profile,seed)?profile.imperfections.leakAmount*strength:0;
  const edge=Math.min(w,h),sampling=Math.min(1,edge/p.scale),leakSide=Math.floor(hash(81,92,seed)*4),leakPosition=.1+hash(29,45,seed)*.8,leakWidth=.018+hash(19,48,seed)*.07,leakHeat=hash(8,95,seed);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=(y*w+x)*3,nx=(x+.5)/w,ny=(y+.5)/h,l=clamp(luma(pixels[i],pixels[i+1],pixels[i+2]));
    if(grain){
      const gx=(x+.5)/edge*p.scale,gy=(y+.5)/edge*p.scale;
      const fine=noise(gx,gy,seed),coarse=noise(gx*.39,gy*.39,seed^871);
      const n=fine*(1-p.coarse)+coarse*p.coarse;
      const response=(.12+.88*Math.sin(Math.PI*l))*(1+p.shadowBoost*(1-l)+scene.lowLight*.18);
      const amplitude=p.amount*(.28+.72*sampling)*grain*response;
      if(p.model==='chemical'){
        const density=noise(nx*8,ny*8,seed^661)*chem*(.3+.7*Math.sin(Math.PI*l));
        const development=smooth(.55,1,Math.max(Math.abs(nx-.5),Math.abs(ny-.5))*2)*chem*(hash(331,42,seed)-.5);
        for(let c=0;c<3;c++)pixels[i+c]+=density+development+n*amplitude*.55;
      }else for(let c=0;c<3;c++)pixels[i+c]+=n*amplitude+noise(gx*.8,gy*.8,seed^(c+1)*2311)*amplitude*p.chroma;
    }
    if(leak){
      const distance=[nx,1-nx,ny,1-ny][leakSide],along=leakSide<2?ny:nx;
      const contour=1+.24*noise(along*7,distance*12,seed^591);
      const amount=Math.exp(-distance/leakWidth*contour-((along-leakPosition)/(.24+leakWidth))**2)*leak*(.55+hash(813,45,seed)*.6);
      const target=[1,.52+leakHeat*.30,.14+leakHeat*.24];for(let c=0;c<3;c++)pixels[i+c]+=(target[c]-pixels[i+c])*amount;
    }
  }
}
