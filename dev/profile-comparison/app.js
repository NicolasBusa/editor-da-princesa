import {CAMERA_PROFILES} from '/cameraProfiles/index.js';
import {createState,captureSeed} from '/model.js';
import {createDemoPhoto,preparePhoto,loadImage,renderEditor,getGeometry} from '/renderer.js';
const $=id=>document.getElementById(id),cards=new Map();let source,version=0;
for(const profile of CAMERA_PROFILES){const article=document.createElement('article'),title=document.createElement('h2'),description=document.createElement('p'),box=document.createElement('div'),canvas=document.createElement('canvas'),info=document.createElement('div'),link=document.createElement('a');title.textContent=profile.name;description.textContent=profile.description;box.className='photo';canvas.setAttribute('aria-label',`Resultado ${profile.name}`);box.append(canvas);info.className='metrics';link.textContent='Baixar comparação PNG';link.download=`${profile.id}-comparacao.png`;link.hidden=true;article.append(title,description,box,info,link);$('comparison').append(article);cards.set(profile.id,{canvas,info,link});}
async function render(){if(!source)return;const current=++version,photo=source,seed=Number($('seed').value)>>>0;$('status').textContent='Revelando as cinco câmeras…';
 try{const results=await Promise.all(CAMERA_PROFILES.map(async profile=>{const state=createState();state.camera=profile.id;state.seed=seed;state.cameraOptions={grain:$('grain').checked,frame:$('frame').checked,lightLeaks:$('leaks').checked,lens:$('lens').checked};state.flash.enabled=$('flash').checked;const temp=document.createElement('canvas'),start=performance.now();await renderEditor(temp,photo,state,new Map(),{maxEdge:640,maxPixels:409600,kind:''});return {profile,state,temp,ms:performance.now()-start};}));
   if(current!==version){results.forEach(r=>{r.temp.width=r.temp.height=1;});return;}
   for(const r of results){const card=cards.get(r.profile.id),g=getGeometry(photo,r.state);card.canvas.width=r.temp.width;card.canvas.height=r.temp.height;card.canvas.getContext('2d').drawImage(r.temp,0,0);card.info.textContent=`${g.width} × ${g.height} px na origem · prévia ${r.temp.width} × ${r.temp.height} · ${Math.round(r.ms)} ms`;card.link.href=r.temp.toDataURL('image/png');card.link.hidden=false;r.temp.width=r.temp.height=1;}
   $('status').textContent='Cinco resultados prontos. A captura permanece estável ao alternar os controles.';
 }catch(error){if(current===version)$('status').textContent=error.message;}
}
$('source').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{source=(await preparePhoto(file)).image;$('seed').value=captureSeed();render();}catch(error){$('status').textContent=error.message;}});
$('sample').addEventListener('click',async()=>{source=await loadImage('/tests/fixtures/synthetic-scenes.png');render();});
for(const id of ['seed','grain','frame','leaks','lens','flash'])$(id).addEventListener('change',render);
$('recapture').addEventListener('click',()=>{$('seed').value=captureSeed();render();});
$('clean').addEventListener('click',()=>{for(const id of ['grain','frame','leaks'])$(id).checked=false;render();});
try{source=await createDemoPhoto();render();}catch(error){$('status').textContent=error.message;}
