const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
async function format(){return import(pathToFileURL(path.resolve(__dirname,'../core/ririra-format/format.js')).href);}
async function readActiveCard(dataDir){try{return JSON.parse(await fs.readFile(path.join(dataDir,'active-card.json'),'utf8'));}catch{return null;}}
async function importCard(dataDir,source){
  if(typeof source!=='string'||path.extname(source).toLowerCase()!=='.ririra')throw Error('请选择 A 导出的 .ririra 卡片');
  const stat=await fs.stat(source),api=await format();if(!stat.isFile()||stat.size>api.MAX_SIZE)throw Error('卡片文件无效或超过 512 MB');
  const result=await api.readRirira(new Blob([await fs.readFile(source)]));
  const id=crypto.randomUUID(),dir=path.join(dataDir,'cards',id);await fs.mkdir(dir,{recursive:true});
  // Asset names are a fixed allowlist validated by the shared format reader.
  for(const [name,blob]of result.assets)await fs.writeFile(path.join(dir,name),new Uint8Array(await blob.arrayBuffer()));
  const card={id,manifest:result.manifest};await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify(result.manifest));
  await fs.writeFile(path.join(dataDir,'active-card.json.tmp'),JSON.stringify(card));await fs.rename(path.join(dataDir,'active-card.json.tmp'),path.join(dataDir,'active-card.json'));return card;
}
module.exports={format,readActiveCard,importCard};
