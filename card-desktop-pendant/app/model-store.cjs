const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
function safeRelative(value){if(typeof value!=='string'||value.length>800||value.includes('\\')||value.includes(':')||value.startsWith('/')||value.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('模型资源路径无效');return value;}
async function saveModel(dataDir,entries){
  if(!Array.isArray(entries)||!entries.length||entries.length>4000)throw Error('模型文件数量无效');
  const seen=new Set();let size=0;const files=[];
  for(const entry of entries){const relative=safeRelative(entry.path);if(seen.has(relative))throw Error('模型资源重名');seen.add(relative);const stat=await fs.stat(entry.source);if(!stat.isFile())throw Error('模型资源不是文件');size+=stat.size;if(size>1024*1024*1024)throw Error('模型资源超过 1 GB');files.push({path:relative,source:entry.source,size:stat.size});}
  if(!files.some(f=>/\.(glb|gltf)$/i.test(f.path)))throw Error('没有模型文件');
  const id=crypto.randomUUID(),folder=path.join(dataDir,'models',id);await fs.mkdir(folder,{recursive:true});
  for(const file of files){const dest=path.join(folder,file.path);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(file.source,dest);}
  const manifest={id,files:files.map(f=>({path:f.path,size:f.size,url:`/saved-models/${id}/${f.path.split('/').map(encodeURIComponent).join('/')}`}))};
  await fs.writeFile(path.join(dataDir,'model.json.tmp'),JSON.stringify(manifest));await fs.rename(path.join(dataDir,'model.json.tmp'),path.join(dataDir,'model.json'));return manifest;
}
async function readModel(dataDir){try{return JSON.parse(await fs.readFile(path.join(dataDir,'model.json'),'utf8'));}catch{return null;}}
async function clearModel(dataDir){await fs.rm(path.join(dataDir,'model.json'),{force:true});}
module.exports={safeRelative,saveModel,readModel,clearModel};
