import { connect, delay } from './cdp.mjs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const browser = await connect(), run = expression => browser.evaluate(expression);
async function until(expression) {
  for (let i = 0; i < 300; i++) { if (await run(expression)) return; await delay(100); }
  throw new Error(`Timeout: ${expression}`);
}
const click = selector => run(`document.querySelector(${JSON.stringify(selector)}).click()`);
try {
  await browser.send('Network.clearBrowserCookies');
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true });
  await browser.send('Page.navigate', { url: 'http://127.0.0.1:4173/login.html' });
  await until(`!!document.querySelector('#login-form')`);
  await run(`fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'1309'})})`);
  await browser.send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
  await until(`document.querySelector('#artboard-loading')?.hidden`);
  await delay(1000);
  assert(await run(`document.querySelector('#artboard').clientHeight > 550`), 'photo fills mobile workspace');
  assert(await run(`document.querySelector('.tool-tabs').scrollWidth > document.querySelector('.tool-tabs').clientWidth`), 'horizontal primary toolbar');
  await click('#tab-adjust');
  assert(await run(`document.querySelector('#artboard').clientHeight > 350`), 'photo remains visible with controls open');
  for (const group of ['light','color','hsl','curves','grading','details','analog','composition']) {
    await click(`[data-group-target="${group}"]`);
    assert(await run(`!document.querySelector('[data-group="${group}"]').hidden`), `group ${group} reachable`);
  }
  await click('[data-group-target="light"]');
  const performanceResult = await run(`(async()=>{
    const canvas=document.querySelector('#photo-canvas'),ctx=canvas.getContext('2d'),original=ctx.drawImage.bind(ctx),frames=[];
    let revealing=false; const start=performance.now(); ctx.drawImage=(...args)=>{frames.push(performance.now()-start);return original(...args)};
    const control=document.querySelector('#control-adjustments-light-exposure');
    for(let i=0;i<25;i++){control.value=i/20;control.dispatchEvent(new Event('input',{bubbles:true}));revealing ||= !document.querySelector('#render-status').hidden;await new Promise(r=>setTimeout(r,40));}
    control.dispatchEvent(new Event('change',{bubbles:true})); await new Promise(r=>setTimeout(r,2200));ctx.drawImage=original;
    return {updatesDuringDrag:frames.filter(t=>t<1000).length,firstFrame:Math.round(frames[0]),revealing,finalWidth:canvas.width};
  })()`);
  assert.equal(performanceResult.revealing, false); assert(performanceResult.updatesDuringDrag >= 3, 'updates while dragging'); assert(performanceResult.finalWidth > 400, 'full preview after release');
  await click('#tab-cameras'); await click('[data-camera="lomo32"]');
  assert(await run(`!document.querySelector('#render-status').hidden`), 'camera preset has revealing indicator');
  await until(`document.querySelector('#render-status').hidden`);
  await click('#tab-stickers'); await click('[data-sticker-id="bunny-heart"]');
  await until(`!!document.querySelector('.sticker-object.selected')`);
  await click('#mirror-sticker'); assert.equal(await run(`document.querySelector('#mirror-sticker').getAttribute('aria-pressed')`), 'true');
  await click('#undo-button'); assert.equal(await run(`document.querySelector('#mirror-sticker').getAttribute('aria-pressed')`), 'false');
  await click('#redo-button'); assert.equal(await run(`document.querySelector('#mirror-sticker').getAttribute('aria-pressed')`), 'true');
  await click('#tab-text'); await click('#add-text');
  await run(String.raw`const input=document.querySelector('#text-content'); input.value='Meu sol ☀\nMeu amor';input.dispatchEvent(new Event('input',{bubbles:true}));input.blur();`);
  await click('#text-bold'); await click('#text-italic');
  await run(`const color=document.querySelector('#text-color');color.value='#673517';color.dispatchEvent(new Event('input',{bubbles:true}));color.dispatchEvent(new Event('change',{bubbles:true}));`);
  const beforeMove = await run(`document.querySelector('.sticker-object.selected').getBoundingClientRect().toJSON()`);
  const x = beforeMove.x + beforeMove.width / 2, y = beforeMove.y + beforeMove.height / 2;
  await browser.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x+22, y: y-35, button: 'left', buttons: 1 });
  await browser.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x+22, y: y-35, button: 'left', clickCount: 1 });
  await delay(200);
  const afterMove = await run(`document.querySelector('.sticker-object.selected').getBoundingClientRect().toJSON()`);
  assert(afterMove.y < beforeMove.y - 20, 'text is draggable');
  await click('#duplicate-sticker'); assert.equal(await run(`document.querySelectorAll('#text-list button').length`), 2);
  await click('#remove-sticker'); assert.equal(await run(`document.querySelectorAll('#text-list button').length`), 1);
  await click('#undo-button'); assert.equal(await run(`document.querySelectorAll('#text-list button').length`), 2);
  const pixels = await run(String.raw`(async()=>{
    const {drawDecorations}=await import('./decorations.js');const {createState}=await import('./model.js');const {renderEditor,exportPhoto,loadImage}=await import('./renderer.js');
    const source=document.createElement('canvas');source.width=source.height=100;const sc=source.getContext('2d');sc.fillStyle='red';sc.fillRect(0,0,50,100);sc.fillStyle='blue';sc.fillRect(50,0,50,100);
    const c=document.createElement('canvas');c.width=c.height=100;const ctx=c.getContext('2d');const sticker={stickerId:'asymmetric',x:.5,y:.5,size:1,rotation:0,flipX:true};drawDecorations(ctx,100,100,{stickers:[sticker]},new Map([['asymmetric',source]]));const flipped=ctx.getImageData(10,50,1,1).data;
    const item={kind:'text',text:'Olá\nPrincesa',font:'serif',bold:true,italic:true,shadow:true,align:'center',x:.5,y:.5,size:.7,rotation:20,color:'#ff0000'};const state={...createState(),intensity:0,frame:'polaroid',stickers:[item]};
    let fixedCaptions=0;const fillText=ctx.fillText.bind(ctx);ctx.fillText=(...args)=>{fixedCaptions++;return fillText(...args)};drawDecorations(ctx,100,100,{frame:'polaroid',stickers:[]});ctx.fillText=fillText;
    const preview=document.createElement('canvas');await renderEditor(preview,source,state,new Map(),{maxEdge:100,kind:''});const blob=await exportPhoto(source,state,new Map(),{format:'png',maxEdge:100});const url=URL.createObjectURL(blob);const image=await loadImage(url);const exp=document.createElement('canvas');exp.width=image.width;exp.height=image.height;exp.getContext('2d').drawImage(image,0,0);URL.revokeObjectURL(url);
    const a=preview.getContext('2d').getImageData(0,0,preview.width,preview.height).data,b=exp.getContext('2d').getImageData(0,0,exp.width,exp.height).data;
    return {flippedBlue:flipped[2]===255&&flipped[0]===0,fixedCaptions,exportMatches:a.length===b.length&&a.every((v,i)=>v===b[i])};
  })()`);
  assert.equal(pixels.flippedBlue,true);assert.equal(pixels.fixedCaptions,0);assert.equal(pixels.exportMatches,true);
  for (const [width,height] of [[320,720],[393,852],[430,932],[700,900],[852,393],[1360,900]]) {
    await browser.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<=700}); await delay(150);
    assert(await run(`document.documentElement.scrollWidth <= innerWidth + 1`), `no overflow at ${width}`);
    if (width<=700) assert(await run(`document.querySelector('.tool-tabs').getBoundingClientRect().bottom <= innerHeight + 1`), `toolbar visible at ${width}`);
  }
  await browser.send('Emulation.setDeviceMetricsOverride',{width:393,height:852,deviceScaleFactor:1,mobile:true});
  await click('#tab-text'); await click('#text-list button'); await delay(250);
  await browser.screenshot(fileURLToPath(new URL('./mobile-text-v5.png', import.meta.url)));
  await click('#close-tools'); await browser.screenshot(fileURLToPath(new URL('./mobile-photo-v5.png', import.meta.url)));
  assert.deepEqual(browser.errors, []);
  console.log(JSON.stringify({performanceResult,pixels,layouts:6,allGroups:true,textGestures:true,mirrorHistory:true},null,2));
} finally { browser.close(); }
