import { GLTFExporter } from './vendor/three/addons/exporters/GLTFExporter.js';
import { decompress } from './vendor/three/addons/utils/WebGLTextureUtils.js';
import { initRiriraExport } from './ririra-export.js';
import * as THREE from './vendor/three/three.module.js';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
import { createBuiltinAssets } from './builtin-assets.js';
import { initModelImport, disposeModel } from './model-import.js';
import { createRenderStyles } from './render-styles.js';
import { createCardBackgrounds } from './card-backgrounds.js';
import { createCardText } from './card-text.js';
import { initGifExport } from './gif-export.js';
import { initPngExport } from './png-export.js';
import { createCardEffects } from './card-effects.js';
import { createCharacterOpacity } from './character-opacity.js';
import { createCardFrames } from './card-frames.js';
import { createModelLighting } from './model-lighting.js';

const $=s=>document.querySelector(s),canvas=$('#canvas'),host=$('.viewer');
const exampleDownloads=$('.bottom').innerHTML;
let renderer,controls,model,ready=false,lost=false,cardVisible=true,raf=0;
let backgrounds,cardText,cardEffects,characterOpacity,cardFrames,modelLighting,bundleBaseTextures;
let effectsRaf=0,effectsLastTime=0;
let exporting=false;
for(const event of ['dragover','drop'])host.addEventListener(event,e=>{if(exporting){e.preventDefault();e.stopImmediatePropagation();}},true);
const print=new THREE.Scene(),character=new THREE.Scene(),overprint=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(30,1,.01,50);
const defaultDistance=4.6,homeTarget=new THREE.Vector3(0,.025,0);
const state={ready:false,renderMode:'live-webgl',yaw:0,pitch:0,zoom:100,meshCount:0,triangleCount:0,modelName:'原创水晶示例',imported:false};
const styles=createRenderStyles({onChange:value=>{state.style=value.id;state.styleStrength=value.strength;invalidate();}});
let resolveReady;window.characterReady=new Promise(r=>resolveReady=r);
window.__card3d={state,getState:()=>({...state,camera:camera.position.toArray(),target:controls?.target.toArray(),drawCalls:renderer?.info.render.calls,cardVisible,wireframe:$('#wireframe').checked}),setView:(yaw,pitch=0)=>setView(yaw,pitch),reset:()=>reset(),render:()=>draw(),renderer:()=>renderer,applyRiriraView};

function shape(w,h,r){const p=new THREE.Shape(),x=-w/2,y=-h/2;p.moveTo(x+r,y);p.lineTo(x+w-r,y);p.quadraticCurveTo(x+w,y,x+w,y+r);p.lineTo(x+w,y+h-r);p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);p.lineTo(x+r,y+h);p.quadraticCurveTo(x,y+h,x,y+h-r);p.lineTo(x,y+r);p.quadraticCurveTo(x,y,x+r,y);return p;}
function faceGeometry(w=1.4,h=2.1,r=.025){const g=new THREE.ShapeGeometry(shape(w,h,r),24),uv=g.attributes.uv,positions=g.attributes.position;for(let i=0;i<uv.count;i++)uv.setXY(i,positions.getX(i)/w+.5,positions.getY(i)/h+.5);return g;}
function face(map,z,scene){const mesh=new THREE.Mesh(faceGeometry(),new THREE.MeshBasicMaterial({map,transparent:true,alphaTest:.01,depthWrite:false,toneMapped:false,side:THREE.FrontSide}));mesh.position.z=z;scene.add(mesh);return mesh;}
function ring(w,h,r,z,width,color){const points=shape(w,h,r).getPoints(100).map(p=>new THREE.Vector3(p.x,p.y,z));const curve=new THREE.CatmullRomCurve3(points,true,'centripetal');return new THREE.Mesh(new THREE.TubeGeometry(curve,200,width,5,true),new THREE.MeshStandardMaterial({color,metalness:.65,roughness:.45}));}
function loadTexture(url){return new Promise((resolve,reject)=>new THREE.TextureLoader().load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);resolve(t)},undefined,reject));}

function updateUI(){if(!controls)return;let yaw=THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()),pitch=90-THREE.MathUtils.radToDeg(controls.getPolarAngle());yaw=((yaw+180)%360+360)%360-180;const zoom=defaultDistance/camera.position.distanceTo(controls.target)*100;Object.assign(state,{yaw,pitch,zoom});$('#yaw').value=yaw;$('#pitch').value=pitch;$('#zoom').value=zoom;$('#yaw-value').value=`${yaw.toFixed(1)}°`;$('#pitch-value').value=`${pitch.toFixed(1)}°`;$('#zoom-value').value=`${Math.round(zoom)}%`;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',(b.dataset.view==='front'&&Math.abs(yaw)<.6&&Math.abs(pitch)<.6)||(b.dataset.view==='back'&&Math.abs(yaw)>179.4)||(b.dataset.view==='left'&&Math.abs(yaw+45)<.6)||(b.dataset.view==='right'&&Math.abs(yaw-45)<.6)));}
function draw(){if(!renderer||lost)return;renderer.info.reset();renderer.clear();if(cardVisible)renderer.render(print,camera);const front=camera.position.z-controls.target.z>0;if(!cardVisible||front){renderer.clearDepth();if(characterOpacity)characterOpacity.render();else renderer.render(character,camera);if(cardVisible){renderer.clearDepth();renderer.render(overprint,camera);}}updateUI();}
function invalidate(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;draw();});}
function animateEffects(time){effectsRaf=0;if(!ready||exporting||lost||!cardVisible||document.hidden||!cardEffects?.needsAnimation())return;if(!effectsLastTime)effectsLastTime=time;const delta=time-effectsLastTime;if(delta>=1000/30){cardEffects.tick(Math.min(delta/1000,.1));effectsLastTime=time;draw();}effectsRaf=requestAnimationFrame(animateEffects);}
function refreshEffectsAnimation(){cancelAnimationFrame(effectsRaf);effectsRaf=0;effectsLastTime=0;if(ready&&!exporting&&!lost&&cardVisible&&!document.hidden&&cardEffects?.needsAnimation())effectsRaf=requestAnimationFrame(animateEffects);}
document.addEventListener('visibilitychange',refreshEffectsAnimation);
function setView(yaw,pitch=state.pitch,distance=camera.position.distanceTo(controls.target)){if(!controls)return;const y=THREE.MathUtils.degToRad(yaw),p=THREE.MathUtils.degToRad(pitch);camera.position.copy(controls.target).add(new THREE.Vector3(Math.sin(y)*Math.cos(p),Math.sin(p),Math.cos(y)*Math.cos(p)).multiplyScalar(distance));controls.update();draw();}
function reset(){if(!controls)return;controls.target.copy(homeTarget);setView(0,0,defaultDistance);$('#status').textContent='静止查看 · 拖动即可旋转';}
function resize(){if(!renderer||exporting)return;const w=host.clientWidth,h=host.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);draw();}
function onFailure(error){console.error(error);$('#loading').hidden=false;$('#loading-label').textContent='暂时无法载入 3D 角色';$('#loading-detail').textContent='请重新加载；本页需要支持 WebGL 的浏览器。';$('#retry').hidden=false;$('#retry').onclick=()=>location.reload();}
function materialList(o){return Array.isArray(o.material)?o.material:o.material?[o.material]:[];}
function installModel(content,{name='原创水晶示例',imported=false,prepared=false}={}){
  content.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(content,true),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  if(bounds.isEmpty()||!Number.isFinite(size.length())||size.length()<1e-8)throw Error('模型中没有可显示的三维网格。');
  const next=new THREE.Group();next.name='Model placement';let count=0,triangles=0;
  content.traverse(o=>{if(o.isLight)o.visible=false;if(!o.isMesh)return;count++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;
    if(!imported){const old=o.material;o.material=new THREE.MeshBasicMaterial({map:old.map,color:0xffffff,side:THREE.DoubleSide,transparent:false,alphaTest:.33,toneMapped:true});old.dispose();}
    for(const mat of materialList(o)){mat.wireframe=$('#wireframe').checked;styles.attach(mat);modelLighting?.attach(mat);for(const value of Object.values(mat))if(value?.isTexture)value.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);}
  });
  if(!count)throw Error('模型中没有可显示的三维网格。');
  if(imported&&!prepared){const fit=new THREE.Group(),factor=Math.min(1.45/Math.max(size.y,1e-6),1.1/Math.max(size.x,1e-6));fit.add(content);fit.scale.setScalar(factor);fit.position.set(-center.x*factor,.07-center.y*factor,-center.z*factor);next.add(fit);}else next.add(content);
  const old=model;model=next;character.add(model);if(old){character.remove(old);disposeModel(old);}
  Object.assign(state,{modelName:name,imported,meshCount:count,triangleCount:triangles});$('.subtitle').textContent=`${name} · 3D 模型`;reset();
  $('.bottom').innerHTML=imported?'单指旋转，双指缩放与平移。<br>可导入自己的模型并导出 PNG / GIF。':exampleDownloads;
}

async function captureRirira(){
  const enabled=controls.enabled;controls.enabled=false;exporting=true;refreshEffectsAnimation();
  try{
    const exporter=new GLTFExporter();exporter.setTextureUtils({decompress});
    exporter.register(()=>({writeNode:(_,def)=>{delete def.extras;},writeMaterialAsync:async(_,def)=>{delete def.extras;},writeTexture:(_,def)=>{delete def.extras;}}));
    model.updateMatrixWorld(true);
    const bytes=await exporter.parseAsync(model,{binary:true,trs:true,onlyVisible:true,maxTextureSize:8192});
    const png=async (image,max=8192)=>{const c=document.createElement('canvas');const factor=Math.min(1,max/Math.max(image.width,image.height));c.width=Math.max(1,Math.round(image.width*factor));c.height=Math.max(1,Math.round(image.height*factor));c.getContext('2d').drawImage(image,0,0,c.width,c.height);const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));if(!blob)throw Error('卡面图片无法打包');return blob;};
    draw();
    return {title:cardText.getState().title||'我的卡片',modelName:state.modelName,settings:{'card.text':JSON.stringify(cardText.getState()),'card.background':backgrounds.getState().id,'card.frame':cardFrames.getState().id,'card.effects':JSON.stringify(cardEffects.getState()),'card.renderStyle':JSON.stringify(styles.getState()),'card.lighting':JSON.stringify(modelLighting.getState()),'card.characterTransparency':String(characterOpacity.getValue())},view:{position:camera.position.toArray(),target:controls.target.toArray(),cardVisible,wireframe:$('#wireframe').checked,phase:cardEffects.getPhase()},assets:{'model.glb':new Blob([bytes],{type:'model/gltf-binary'}),'background.png':await png(bundleBaseTextures.bg.image),'foreground.png':await png(bundleBaseTextures.petals.image),'preview.png':await png(canvas,1280)}};
  }finally{controls.enabled=enabled;exporting=false;refreshEffectsAnimation();draw();}
}
function applyRiriraView(view){
  controls.target.fromArray(view.target);camera.position.fromArray(view.position);camera.lookAt(controls.target);controls.update();
  $('#show-card').checked=view.cardVisible;cardVisible=view.cardVisible;
  $('#wireframe').checked=view.wireframe;model.traverse(o=>{for(const mat of materialList(o))mat.wireframe=view.wireframe;});
  cardEffects.setPhase(view.phase);draw();refreshEffectsAnimation();
}

function exportName(){return `${(cardText.getState().title||'闪卡').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,60)}-${backgrounds.getState().name}-${styles.getState().name}-${cardEffects.getLabel()}-${cardFrames.getState().name}-${modelLighting.getLabel()}`;}
function beginGifCapture(width,height){
  const limit=Math.min(renderer.capabilities.maxTextureSize,renderer.getContext().getParameter(renderer.getContext().MAX_RENDERBUFFER_SIZE));
  if(width>limit||height>limit)throw Error(`当前显卡最大支持 ${limit} 像素，请选择较小尺寸。`);
  const resources=[cardText,cardFrames,backgrounds,cardEffects].map(controller=>[controller,controller.getResolution()]);
  const target=new THREE.WebGLRenderTarget(width,height,{depthBuffer:true});target.samples=width*height>3000000?0:Math.min(4,renderer.capabilities.maxSamples);target.texture.colorSpace=THREE.SRGBColorSpace;
  const session={resources,width,height,target,position:camera.position.clone(),quaternion:camera.quaternion.clone(),aspect:camera.aspect,renderTarget:renderer.getRenderTarget(),controlsEnabled:controls.enabled,spherical:new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target)),pixels:new Uint8Array(width*height*4),effectPhase:cardEffects.getPhase()};
  session.image=document.createElement('canvas');session.image.width=width;session.image.height=height;session.output=document.createElement('canvas');session.output.width=width;session.output.height=height;
  controls.enabled=false;exporting=true;refreshEffectsAnimation();for(const [controller,resolution]of resources)controller.setResolution(Math.max(width,resolution));return session;
}
function captureGifFrame(s,yaw,pitch,phase=0,displayOutput=false){
  if(lost)throw Error('3D 画面暂时中断，请恢复后重试。');
  const screenSize=renderer.getSize(new THREE.Vector2()),screenRatio=renderer.getPixelRatio();
  const orbit=s.spherical.clone();orbit.theta+=THREE.MathUtils.degToRad(yaw);orbit.phi=THREE.MathUtils.clamp(orbit.phi-THREE.MathUtils.degToRad(pitch),.02,Math.PI-.02);
  try{
    cardEffects.render(s.effectPhase+phase);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(orbit));camera.lookAt(controls.target);camera.aspect=s.width/s.height;camera.updateProjectionMatrix();if(displayOutput)renderer.setDrawingBufferSize(s.width,s.height,1);
    renderer.setRenderTarget(displayOutput?null:s.target);draw();
    const imageCtx=s.image.getContext('2d');
    if(displayOutput){imageCtx.clearRect(0,0,s.width,s.height);imageCtx.drawImage(canvas,0,0);}else{
      renderer.readRenderTargetPixels(s.target,0,0,s.width,s.height,s.pixels);
      const frame=imageCtx.createImageData(s.width,s.height),stride=s.width*4;
      for(let row=0;row<s.height;row++)frame.data.set(s.pixels.subarray((s.height-1-row)*stride,(s.height-row)*stride),row*stride);
      imageCtx.putImageData(frame,0,0);
    }const ctx=s.output.getContext('2d'),g=ctx.createRadialGradient(s.width/2,s.height*.44,0,s.width/2,s.height*.44,Math.max(s.width,s.height)*.6);g.addColorStop(0,'#302434');g.addColorStop(.6,'#1b1523');g.addColorStop(1,'#100e17');ctx.fillStyle=g;ctx.fillRect(0,0,s.width,s.height);ctx.drawImage(s.image,0,0);return ctx.getImageData(0,0,s.width,s.height).data;
  }finally{if(displayOutput)renderer.setDrawingBufferSize(screenSize.x,screenSize.y,screenRatio);renderer.setRenderTarget(s.renderTarget);camera.position.copy(s.position);camera.quaternion.copy(s.quaternion);camera.aspect=s.aspect;camera.updateProjectionMatrix();}
}
function endGifCapture(s){renderer.setRenderTarget(s.renderTarget);camera.position.copy(s.position);camera.quaternion.copy(s.quaternion);camera.aspect=s.aspect;camera.updateProjectionMatrix();controls.enabled=s.controlsEnabled;for(const [controller,resolution]of s.resources)controller.setResolution(resolution);cardEffects.setPhase(s.effectPhase);exporting=false;s.target.dispose();controls.update();resize();refreshEffectsAnimation();}
function placement(value){if(!model)return;model.scale.setScalar(value.size/100);model.position.set(value.x/100,value.y/100,value.z/100);model.rotation.set(THREE.MathUtils.degToRad(value.tilt),THREE.MathUtils.degToRad(value.turn),THREE.MathUtils.degToRad(value.roll));draw();}
function closeup(faceOnly){if(!ready)return;if(!state.imported){controls.target.set(...(faceOnly?[.075,.44,.04]:[.035,.48,.02]));setView(0,0,faceOnly ? .62 : 1.6);}else{model.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(model,true),c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3());controls.target.set(c.x,b.min.y+s.y*(faceOnly ? .85 : .65),c.z);setView(0,0,faceOnly ? .75 : 1.6);}$('#status').textContent=faceOnly?'脸部特写 · 拖动检查侧脸':'人物近景 · 仍可自由旋转';}
async function init(){try{
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.autoClear=false;renderer.info.autoReset=false;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.AgXToneMapping;renderer.toneMappingExposure=1.0;renderer.setClearColor(0,0);
  camera.position.copy(homeTarget).add(new THREE.Vector3(0,0,defaultDistance));controls=new OrbitControls(camera,canvas);controls.target.copy(homeTarget);controls.enableDamping=false;controls.autoRotate=false;controls.minDistance=.45;controls.maxDistance=defaultDistance/.7;controls.minPolarAngle=THREE.MathUtils.degToRad(10);controls.maxPolarAngle=THREE.MathUtils.degToRad(170);controls.enablePan=true;controls.addEventListener('change',invalidate);controls.addEventListener('start',()=>$('#status').textContent='正在手动查看');controls.addEventListener('end',()=>$('#status').textContent='视角已停留 · 可导出当前画面');controls.update();
  new ResizeObserver(resize).observe(host);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;$('#loading').hidden=false;$('#loading-label').textContent='正在恢复 3D 画面…';});canvas.addEventListener('webglcontextrestored',()=>{lost=false;$('#loading').hidden=!ready;draw();refreshEffectsAnimation();});
  modelLighting=createModelLighting({scene:character,onChange:value=>{state.lighting=value;invalidate();},onDirection:direction=>styles.setKeyDirection(direction)});
  const {scene:demo,bg,petals,native,modelName,prepared=false,bundleView}=await createBuiltinAssets();
  installModel(demo,{name:modelName,imported:!native,prepared});
  const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape(1.4,2.1,.025),{depth:.012,bevelEnabled:false,curveSegments:24}),[new THREE.MeshStandardMaterial({color:0x2a202c,roughness:.7,metalness:.2}),new THREE.MeshStandardMaterial({color:0xa67b72,roughness:.4,metalness:.6})]);slab.position.z=-.019;print.add(slab);
  bundleBaseTextures={bg,petals};
  const backgroundMesh=face(bg,.0001,print);
  const metalRims=[ring(1.4,2.1,.025,.001,.0025,0xd2a99c),ring(1.338,2.035,.025,.002,.0009,0xc7a092)];print.add(...metalRims);
  const ambient=new THREE.AmbientLight(0xffffff,1.7),key=new THREE.DirectionalLight(0xffe3d1,2.5);key.position.set(-2,3,4);print.add(ambient,key);
  const petalMesh=face(petals,.012,overprint);
  backgrounds=createCardBackgrounds({original:bg,mesh:backgroundMesh,effects:petalMesh,onChange:value=>{state.background=value.id;invalidate();}});
  cardText=createCardText({onChange:value=>{state.cardTitle=value.title;invalidate();}});
  cardEffects=createCardEffects({onChange:value=>{state.effects=value.layers;invalidate();refreshEffectsAnimation();}});
  const effectMesh=face(cardEffects.texture,.013,overprint);effectMesh.renderOrder=1;
  const textMesh=face(cardText.front,.015,overprint);textMesh.renderOrder=2;const back=face(cardText.back,-.0191,print);back.rotation.y=Math.PI;
  cardFrames=createCardFrames({onChange:value=>{state.frame=value.id;for(const rim of metalRims)rim.material.color.set(value.color);slab.material[1].color.set(value.color);cardText.setFrameAccent(value.color);invalidate();}});
  const frontFrame=face(cardFrames.texture,.017,overprint);frontFrame.renderOrder=3;const backFrame=face(cardFrames.texture,-.0193,print);backFrame.rotation.y=Math.PI;
  window.__card3d.importer=initModelImport({renderer,host,installModel,onPlacement:placement,restoreBuiltin:async()=>{const {scene,native,modelName}=await createBuiltinAssets();installModel(scene,{name:modelName,imported:!native});}});
  characterOpacity=createCharacterOpacity({renderer,scene:character,camera,onChange:value=>{state.characterTransparency=value;invalidate();}});
  initPngExport({canStart:()=>ready&&!lost&&!$('#import-files')?.disabled,beginCapture:beginGifCapture,captureFrame:s=>captureGifFrame(s,0,0,0,true),endCapture:endGifCapture,fileName:()=>exportName(),viewportSize:()=>[canvas.width,canvas.height]});
  initGifExport({canStart:()=>ready&&!lost&&!$('#import-files')?.disabled,beginCapture:beginGifCapture,captureFrame:captureGifFrame,endCapture:endGifCapture,fileName:()=>exportName()+'-循环',loopDuration:()=>{const e=cardEffects.getState();return e.layers.length&&e.strength>0?2400*100/e.speed:2400;}});
  initRiriraExport({canStart:()=>ready&&!lost&&!exporting&&!$('#import-files')?.disabled,capture:captureRirira,fileName:()=>cardText.getState().title});
  if(bundleView)applyRiriraView(bundleView);
  ready=true;state.ready=true;$('#loading').hidden=true;resize();refreshEffectsAnimation();resolveReady(true);window.dispatchEvent(new Event('card-ready'));
}catch(e){resolveReady(false);onFailure(e);}}

$('#yaw').oninput=e=>setView(+e.target.value,state.pitch);$('#pitch').oninput=e=>setView(state.yaw,+e.target.value);$('#zoom').oninput=e=>setView(state.yaw,state.pitch,defaultDistance/(+e.target.value/100));
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{controls.target.copy(homeTarget);const angles={front:0,left:-45,right:45,back:180};setView(angles[b.dataset.view],0,defaultDistance);});
$('#reset').onclick=reset;$('#face-detail').onclick=()=>closeup(true);$('#face').onclick=()=>closeup(false);
$('#wireframe').onchange=e=>{if(!model)return;model.traverse(o=>{for(const mat of materialList(o)){mat.wireframe=e.target.checked;mat.needsUpdate=true;}});draw();};
$('#show-card').onchange=e=>{cardVisible=e.target.checked;draw();refreshEffectsAnimation();};
canvas.addEventListener('keydown',e=>{if(!ready||exporting)return;const step=e.shiftKey?10:2;if(e.key==='ArrowLeft')setView(state.yaw-step);else if(e.key==='ArrowRight')setView(state.yaw+step);else if(e.key==='ArrowUp')setView(state.yaw,Math.min(80,state.pitch+step));else if(e.key==='ArrowDown')setView(state.yaw,Math.max(-80,state.pitch-step));else if(e.key==='Home')reset();else return;e.preventDefault();});
init();

