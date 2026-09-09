import {getCameraProfile} from '../../cameraProfiles/index.js';
export function frameGeometry(fullWidth,fullHeight,crop,state) {
  const profile=getCameraProfile(state.camera),f=profile.format,c={...crop};
  let ratio=f.ratio;
  if(f.autoOrient&&fullHeight>fullWidth)ratio=1/ratio;
  // A manual crop defines the region of interest; the film gate fits inside it.
  if(!state.formatBypass){const w=fullWidth*c.width,h=fullHeight*c.height;
    if(w/h>ratio){const width=h*ratio/fullWidth;c.x+=(c.width-width)/2;c.width=width;}
    else {const height=w/ratio/fullHeight;c.y+=(c.height-height)/2;c.height=height;}
  }
  const imageWidth=Math.max(1,Math.round(fullWidth*c.width)),imageHeight=Math.max(1,Math.round(fullHeight*c.height));
  const print=!state.formatBypass&&state.cameraOptions?.frame!==false?f.print:null;
  return {crop:c,imageWidth,imageHeight,print,width:print?Math.round(imageWidth*print.width/print.imageWidth):imageWidth,height:print?Math.round(imageHeight*print.height/print.imageHeight):imageHeight};
}
export function imagePlacement(geometry,size) {
  const p=geometry.print;if(!p)return {x:0,y:0,width:size.width,height:size.height};
  return {x:Math.round(size.width*p.left/p.width),y:Math.round(size.height*p.top/p.height),width:Math.max(1,Math.round(size.width*p.imageWidth/p.width)),height:Math.max(1,Math.round(size.height*p.imageHeight/p.height))};
}
export function drawPrint(ctx,canvas,geometry,size) {
  const slot=imagePlacement(geometry,size);
  if(geometry.print){ctx.fillStyle='#f8f5ee';ctx.fillRect(0,0,size.width,size.height);}
  ctx.drawImage(canvas,slot.x,slot.y,slot.width,slot.height);
}
