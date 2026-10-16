// Ririra v1: 12-byte header, UTF-8 JSON manifest, then contiguous binary assets.
export const MAGIC='RIRIRA01',MAX_SIZE=512*1024*1024;
export const SETTINGS=['card.text','card.background','card.frame','card.effects','card.renderStyle','card.lighting','card.characterTransparency'];
const ASSET_NAMES=new Set(['model.glb','background.png','foreground.png','preview.png']);
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const hash=async blob=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(n=>n.toString(16).padStart(2,'0')).join('');
const fail=message=>{throw Error(message);};
function finiteVector(value){return Array.isArray(value)&&value.length===3&&value.every(v=>Number.isFinite(v)&&Math.abs(v)<10000);}
export function validateManifest(m){
  if(!m||m.format!=='ririra-card')fail('不是有效的 Ririra 卡片文件');
  if(m.version!==1||m.rendererVersion!==1)fail('该卡片使用较新的格式，请更新桌面挂件 B');
  if(typeof m.title!=='string'||m.title.length>200)fail('卡片标题无效');
  if(!m.settings||typeof m.settings!=='object'||Array.isArray(m.settings))fail('缺少卡面设置');
  for(const [key,value]of Object.entries(m.settings))if(!SETTINGS.includes(key)||typeof value!=='string'||value.length>20000)fail('卡面设置无效');
  if(!finiteVector(m.view?.position)||!finiteVector(m.view?.target))fail('观察角度无效');
  const distance=Math.hypot(...m.view.position.map((v,i)=>v-m.view.target[i]));if(distance<.01||distance>100)fail('观察距离无效');
  if(typeof m.view.cardVisible!=='boolean'||typeof m.view.wireframe!=='boolean'||!Number.isFinite(m.view.phase)||m.view.phase<0||m.view.phase>=1)fail('显示设置无效');
  if(m.model?.entry!=='model.glb'||m.model?.prepared!==true||typeof m.model?.name!=='string'||m.model.name.length>200)fail('模型说明无效');
  if(!Array.isArray(m.assets)||m.assets.length<3||m.assets.length>4)fail('资源清单无效');
  const seen=new Set();let offset=0;
  for(const a of m.assets){
    if(!a||!ASSET_NAMES.has(a.path)||seen.has(a.path))fail('资源路径无效或重复');seen.add(a.path);
    if(!Number.isSafeInteger(a.length)||a.length<1||a.length>MAX_SIZE||a.offset!==offset||!/^[0-9a-f]{64}$/.test(a.sha256))fail('资源长度或校验信息无效');
    offset+=a.length;if(offset>MAX_SIZE)fail('卡片资源超过 512 MB');
  }
  for(const name of ['model.glb','background.png','foreground.png'])if(!seen.has(name))fail('卡片缺少必要资源：'+name);
  return offset;
}
export async function createRirira({title,settings,view,modelName,assets}){
  let offset=0;const entries=[],parts=[];
  for(const [path,blob]of Object.entries(assets)){
    if(!ASSET_NAMES.has(path)||!(blob instanceof Blob)||!blob.size)fail('待打包资源无效');
    entries.push({path,offset,length:blob.size,sha256:await hash(blob)});parts.push(blob);offset+=blob.size;
    if(offset>MAX_SIZE)fail('卡片资源超过 512 MB');
  }
  const manifest={format:'ririra-card',version:1,rendererVersion:1,title,model:{entry:'model.glb',name:modelName,prepared:true},settings,view,assets:entries};
  validateManifest(manifest);const json=encoder.encode(JSON.stringify(manifest));if(json.length>1024*1024)fail('卡片说明过大');
  const header=new Uint8Array(12);header.set(encoder.encode(MAGIC));new DataView(header.buffer).setUint32(8,json.length,true);
  const result=new Blob([header,json,...parts],{type:'application/x-ririra-card'});if(result.size>MAX_SIZE)fail('卡片文件超过 512 MB');return result;
}
export async function readRirira(blob,{verify=true}={}){
  if(!(blob instanceof Blob)||blob.size<14||blob.size>MAX_SIZE)fail('卡片为空、损坏或超过 512 MB');
  const header=new Uint8Array(await blob.slice(0,12).arrayBuffer());if(decoder.decode(header.slice(0,8))!==MAGIC)fail('不是 .ririra 卡片文件');
  const length=new DataView(header.buffer).getUint32(8,true);if(length<2||length>1024*1024||12+length>blob.size)fail('卡片文件头损坏');
  let manifest;try{manifest=JSON.parse(decoder.decode(new Uint8Array(await blob.slice(12,12+length).arrayBuffer())));}catch{fail('卡片说明无法读取');}
  const total=validateManifest(manifest),start=12+length;if(start+total!==blob.size)fail('卡片文件不完整或长度不匹配');
  const assets=new Map();
  for(const entry of manifest.assets){const part=blob.slice(start+entry.offset,start+entry.offset+entry.length,entry.path.endsWith('.png')?'image/png':'model/gltf-binary');if(verify&&await hash(part)!==entry.sha256)fail('卡片资源校验失败：'+entry.path);assets.set(entry.path,part);}
  const model=assets.get('model.glb');const glb=new DataView(await model.slice(0,20).arrayBuffer());
  if(model.size<20||glb.getUint32(0,true)!==0x46546c67||glb.getUint32(4,true)!==2||glb.getUint32(8,true)!==model.size||glb.getUint32(16,true)!==0x4e4f534a)fail('卡片中的三维模型无效');
  const jsonLength=glb.getUint32(12,true);if(jsonLength>16*1024*1024||20+jsonLength>model.size)fail('模型结构损坏');
  let doc;try{doc=JSON.parse(await model.slice(20,20+jsonLength).text());}catch{fail('模型说明损坏');}
  if((doc.buffers||[]).some(b=>b.uri)||(doc.images||[]).some(i=>i.uri))fail('卡片模型包含外部资源，必须从 A 重新打包');
  for(const name of ['background.png','foreground.png',...(assets.has('preview.png')?['preview.png']:[])]){const sig=new Uint8Array(await assets.get(name).slice(0,24).arrayBuffer());if(sig.length<24||[137,80,78,71,13,10,26,10].some((v,i)=>sig[i]!==v))fail('卡片图片无效');const dv=new DataView(sig.buffer);if(dv.getUint32(16)<1||dv.getUint32(20)<1||dv.getUint32(16)>8192||dv.getUint32(20)>8192)fail('卡片图片尺寸过大');}
  return {manifest,assets};
}
