import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from './vendor/three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from './vendor/three/addons/libs/meshopt_decoder.module.js';

const normalize=p=>{const parts=[];for(const s of p.replaceAll('\\','/').split('/')){if(!s||s==='.')continue;if(s==='..')parts.pop();else parts.push(s);}return parts.join('/');};
const rootName=p=>p.split('/').pop();
const savedConversionKey='card.lastFf14Conversion';
async function convertFf14(entry,files,report){
  const folder=entry.path.includes('/')?entry.path.slice(0,entry.path.lastIndexOf('/')+1):'';
  const selected=files.filter(f=>f.path.startsWith(folder));
  if(!selected.some(f=>f.path.toLowerCase().startsWith((folder+'cache/').toLowerCase())))throw Error('FF14 模型需要完整的 cache 贴图文件夹，请使用“选择文件夹”重新选择整个导出目录。');
  async function request(url,options){const response=await fetch(url,options);const result=await response.json();if(!response.ok)throw Error(result.error||'本机转换服务不可用');return result;}
  report('正在准备本机 FF14 材质转换…');
  const job=await request('/api/conversions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({modelPath:entry.path,files:selected.map(f=>({path:f.path,size:f.file.size}))})});
  let next=0,done=0;
  await Promise.all(Array.from({length:Math.min(4,selected.length)},async()=>{while(next<selected.length){const f=selected[next++];await request(`/api/conversions/${job.id}/files?path=${encodeURIComponent(f.path)}`,{method:'PUT',body:f.file});done++;report(`正在传递给本机转换器 ${done} / ${selected.length}…`);}}));
  await request(`/api/conversions/${job.id}/start`,{method:'POST'});
  for(;;){const state=await request(`/api/conversions/${job.id}`);report(state.message);if(state.status==='failed')throw Error(state.message);if(state.status==='complete')return state.url;await new Promise(resolve=>setTimeout(resolve,900));}
}
function documentFrom(data){if(typeof data==='string')return JSON.parse(data);const view=new DataView(data);if(view.byteLength<20||view.getUint32(0,true)!==0x46546c67)throw Error('这不是有效的 GLB 文件。');const length=view.getUint32(12,true);if(view.getUint32(16,true)!==0x4e4f534a||20+length>data.byteLength)throw Error('GLB 文件的结构不完整。');return JSON.parse(new TextDecoder().decode(new Uint8Array(data,20,length)).replace(/\0+$/,''));}

export function initModelImport({renderer,host,installModel,restoreBuiltin,onPlacement}){
  const style=document.createElement('link');style.rel='stylesheet';style.href='./model-import.css';document.head.append(style);
  const section=document.createElement('section');section.className='import-section';section.setAttribute('aria-label','模型导入');
  section.innerHTML=`<div class="section-label">角色模型<span class="import-local">本机处理</span></div><div class="import-buttons"><button class="secondary" id="import-files">选择文件</button><button class="secondary" id="import-folder">选择文件夹</button></div><input id="model-files" type="file" multiple accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp,.ktx2" hidden><input id="model-folder" type="file" webkitdirectory multiple hidden><p class="import-help">GLB 选单个文件；glTF 请连同 bin 和贴图一起选择，或选择整套文件夹。也可拖到左侧画面。</p><label class="import-choice" hidden>文件中的模型<select id="model-choice" aria-label="选择要载入的模型"></select></label><p id="import-message" role="status">当前：原创水晶示例</p><button class="text-button" id="restore-model">恢复示例模型</button><details id="placement"><summary>摆放模型</summary><div id="placement-fields"></div><button class="secondary placement-reset" id="placement-reset">重置模型摆放</button></details>`;
  document.querySelector('.side').prepend(section);
  const fields=[['size','大小',30,200,1,100,'%'],['x','左右位置',-70,70,1,0,''],['y','上下位置',-80,80,1,0,''],['z','前后位置',-60,60,1,0,''],['turn','人物朝向',-180,180,1,0,'°'],['tilt','前后倾斜',-180,180,1,0,'°'],['roll','左右倾斜',-180,180,1,0,'°']];
  const placement={};
  for(const [key,label,min,max,step,value,unit] of fields){placement[key]=value;const block=document.createElement('div');block.className='range-block';block.innerHTML=`<label class="range-label" for="model-${key}">${label}<output id="model-${key}-value">${value}${unit}</output></label><input id="model-${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">`;section.querySelector('#placement-fields').append(block);block.querySelector('input').oninput=e=>{placement[key]=+e.target.value;block.querySelector('output').value=e.target.value+unit;onPlacement({...placement});};}
  function resetPlacement(){for(const [key,,,,,value,unit] of fields){placement[key]=value;section.querySelector(`#model-${key}`).value=value;section.querySelector(`#model-${key}-value`).value=value+unit;}onPlacement({...placement});}
  section.querySelector('#placement-reset').onclick=resetPlacement;
  const message=section.querySelector('#import-message'),choice=section.querySelector('#model-choice');
  const download=document.createElement('a');download.className='converted-download';download.textContent='下载已转换 GLB';download.hidden=true;section.querySelector('#restore-model').after(download);
  function convertedDownload(url,name){download.href=url;download.download=name.replace(/\.(gltf|glb)$/i,'')+'-材质已转换.glb';download.hidden=false;}
  let files=[],models=[],serial=0,busy=false;
  const draco=new DRACOLoader().setDecoderPath(new URL('./vendor/three/draco/',import.meta.url).href);
  const ktx=new KTX2Loader().setTranscoderPath(new URL('./vendor/three/basis/',import.meta.url).href).detectSupport(renderer);
  function status(text,error=false){message.textContent=text;message.classList.toggle('error',error);}
  function setBusy(value){busy=value;for(const b of section.querySelectorAll('.import-buttons button,#restore-model,#model-choice'))b.disabled=value;section.setAttribute('aria-busy',String(value));}
  function asEntries(list){return Array.from(list).map(file=>({file,path:normalize(file.webkitRelativePath||file.name)}));}
  async function selectFiles(entries){
    if(busy)return;files=entries;models=files.filter(e=>/\.(glb|gltf)$/i.test(e.path));
    choice.replaceChildren();for(const [i,m] of models.entries()){const o=document.createElement('option');o.value=i;o.textContent=m.path;choice.append(o);}
    section.querySelector('.import-choice').hidden=models.length<2;
    if(!models.length){status('没有找到 GLB 或 glTF 模型；当前角色已保留。',true);return;}
    await loadSelected(0);
  }
  async function loadSelected(index){
    const entry=models[index];if(!entry||busy)return;const id=++serial;setBusy(true);status(`正在读取 ${rootName(entry.path)}…`);
    const urls=new Map(),byPath=new Map(files.map(f=>[f.path,f]));let parsed;
    try{
      const data=/\.gltf$/i.test(entry.path)?await entry.file.text():await entry.file.arrayBuffer();
      const json=documentFrom(data),folder=entry.path.includes('/')?entry.path.slice(0,entry.path.lastIndexOf('/')+1):'';
      function resource(uri){
        if(/^(data:|blob:)/i.test(uri))return uri;
        let decoded;try{decoded=decodeURIComponent(uri.split(/[?#]/)[0]);}catch{decoded=uri;}
        const path=normalize(folder+decoded),exact=byPath.get(path)||byPath.get(normalize(decoded));
        const matches=exact?[exact]:files.filter(f=>rootName(f.path)===rootName(normalize(decoded)));
        if(matches.length!==1)throw Error(matches.length?`存在重名资源「${rootName(decoded)}」，请用“选择文件夹”保留目录结构。`:`缺少资源「${decoded}」。请重新选择模型及其 bin、贴图，或选择完整文件夹。`);
        const f=matches[0];if(!urls.has(f.path))urls.set(f.path,URL.createObjectURL(f.file));return urls.get(f.path);
      }
      // Resolve dependencies before parsing; a missing texture must not silently turn white.
      for(const item of [...(json.buffers||[]),...(json.images||[])])if(item.uri&&!/^data:/i.test(item.uri))resource(item.uri);
      const gameMaterial=(json.materials||[]).some(m=>/shpk|ShaderPackage|Meddle/i.test(JSON.stringify(m.extras||{})));
      let convertedUrl=null;
      if(gameMaterial){convertedUrl=await convertFf14(entry,files,status);parsed=await new GLTFLoader().loadAsync(convertedUrl);}
      else{const manager=new THREE.LoadingManager();manager.setURLModifier(resource);const loader=new GLTFLoader(manager).setDRACOLoader(draco).setKTX2Loader(ktx).setMeshoptDecoder(MeshoptDecoder);parsed=await new Promise((resolve,reject)=>loader.parse(data,'',resolve,reject));}
      if(id!==serial){disposeModel(parsed.scene);return;}
      if(parsed.animations.length){const mixer=new THREE.AnimationMixer(parsed.scene);mixer.clipAction(parsed.animations[0]).play();mixer.update(0);mixer.setTime(0);parsed.scene.updateMatrixWorld(true);}
      installModel(parsed.scene,{name:rootName(entry.path),imported:true});resetPlacement();
      if(convertedUrl){convertedDownload(convertedUrl,rootName(entry.path));try{localStorage.setItem(savedConversionKey,JSON.stringify({url:convertedUrl,name:rootName(entry.path)}));}catch{}status(`FF14 材质已转换：${rootName(entry.path)}。可以调整摆放或下载 GLB。`);}
      else{download.hidden=true;try{localStorage.removeItem(savedConversionKey);}catch{}status(`已导入：${rootName(entry.path)}。可展开“摆放模型”调整。`);}
      section.querySelector('#placement').open=true;
    }catch(error){if(parsed?.scene)disposeModel(parsed.scene);status(`导入失败：${error.message||'文件无法读取'} 当前角色已保留。`,true);}
    finally{for(const url of urls.values())URL.revokeObjectURL(url);setBusy(false);}
  }
  choice.onchange=()=>loadSelected(+choice.value);
  section.querySelector('#import-files').onclick=()=>section.querySelector('#model-files').click();
  section.querySelector('#import-folder').onclick=()=>section.querySelector('#model-folder').click();
  for(const selector of ['#model-files','#model-folder'])section.querySelector(selector).onchange=e=>{selectFiles(asEntries(e.target.files));e.target.value='';};
  section.querySelector('#restore-model').onclick=async()=>{if(busy)return;setBusy(true);status('正在恢复示例模型…');try{await restoreBuiltin();resetPlacement();download.hidden=true;try{localStorage.removeItem(savedConversionKey);}catch{}status('当前：原创水晶示例');}catch(e){status('恢复失败，请重试。当前角色已保留。',true);}finally{setBusy(false);}};
  let dragDepth=0;
  host.addEventListener('dragenter',e=>{e.preventDefault();dragDepth++;host.classList.add('drop-active');});
  host.addEventListener('dragover',e=>{e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='copy';});
  host.addEventListener('dragleave',()=>{if(--dragDepth<=0){dragDepth=0;host.classList.remove('drop-active');}});
  host.addEventListener('drop',async e=>{e.preventDefault();dragDepth=0;host.classList.remove('drop-active');if(busy)return;
    const entries=Array.from(e.dataTransfer.items||[]).map(i=>i.webkitGetAsEntry?.()).filter(Boolean),result=[];
    async function walk(entry,prefix=''){if(entry.isFile){const file=await new Promise((resolve,reject)=>entry.file(resolve,reject));result.push({file,path:normalize(prefix+entry.name)});}else if(entry.isDirectory){const reader=entry.createReader();while(true){const batch=await new Promise((resolve,reject)=>reader.readEntries(resolve,reject));if(!batch.length)break;for(const child of batch)await walk(child,prefix+entry.name+'/');}}}
    try{if(entries.length){for(const entry of entries)await walk(entry);}else result.push(...asEntries(e.dataTransfer.files));await selectFiles(result);}catch(error){status(`无法读取拖入的文件：${error.message}`,true);}
  });
  section.querySelector('.import-help').textContent='GLB 可直接导入。FF14 导出请选择包含 cache 的完整文件夹，自动在本机还原材质并烘焙。';
  (async()=>{let saved;try{saved=JSON.parse(localStorage.getItem(savedConversionKey));}catch{}if(!saved?.url||!saved.url.startsWith('/output/conversions/'))return;setBusy(true);status('正在恢复上次已转换的角色…');try{const gltf=await new GLTFLoader().loadAsync(saved.url);installModel(gltf.scene,{name:saved.name,imported:true});resetPlacement();convertedDownload(saved.url,saved.name);status(`已恢复已转换角色：${saved.name}`);}catch{status('上次转换的角色暂时无法读取，可重新选择完整导出文件夹。',true);}finally{setBusy(false);}})();
}

export function disposeModel(root){const geometries=new Set(),materials=new Set(),textures=new Set();root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const mat of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){materials.add(mat);for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);}});for(const texture of textures){texture.dispose();texture.source?.data?.close?.();}for(const mat of materials)mat.dispose();for(const geometry of geometries)geometry.dispose();}
