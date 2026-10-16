const fs=require('fs'),fsp=fs.promises,path=require('path'),crypto=require('crypto'),{spawn}=require('child_process');
const jobs=new Map(),queue=[];let running=false;
const root=path.resolve(__dirname,'..'),base=path.join(root,'output','conversions');
const blender=process.env.BLENDER_PATH||'blender';
function send(res,code,value){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
function relative(value){if(typeof value!=='string'||!value||value.length>800||value.includes('\\')||value.includes(':')||value.startsWith('/')||value.split('/').some(p=>p==='..'||p==='.'))throw Error('文件路径不合法');return value;}
async function jsonBody(req){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>2*1024*1024)throw Error('请求过大');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
function publicJob(job){return {id:job.id,status:job.status,message:job.message,modelName:path.basename(job.modelPath),url:job.status==='complete'?`/output/conversions/${job.id}/web/character.glb`:null};}
function runNext(){if(running||!queue.length)return;running=true;const job=queue.shift();job.status='converting';job.message='正在还原 FF14 材质与染色…';
  const output=path.join(job.dir,'web');fs.mkdirSync(output,{recursive:true});const log=fs.createWriteStream(path.join(job.dir,'conversion.log'));let pending='',lastError='';
  const process=spawn(blender,['-b','--disable-autoexec','--factory-startup','--python-exit-code','1','--python',path.join(root,'scripts','prepare_imported_ff14.py'),'--','--input',path.join(job.input,job.modelPath),'--out',output],{cwd:root,windowsHide:true});
  function consume(chunk){log.write(chunk);pending+=chunk.toString();const lines=pending.split(/\r?\n/);pending=lines.pop();for(const line of lines){if(line.includes('RuntimeError:'))lastError=line.split('RuntimeError:').pop().trim();const m=line.match(/WEB_MESH_READY (\d+)\/(\d+)/);if(m)job.message=`正在烘焙网页贴图 ${m[1]} / ${m[2]}…`;else if(line.includes('MATERIAL_RESTORED'))job.message='正在还原服装、皮肤和头发材质…';}}
  process.stdout.on('data',consume);process.stderr.on('data',consume);
  function finish(code){if(job.finished)return;job.finished=true;log.end();if(code===0&&fs.existsSync(path.join(output,'character.glb'))){job.status='complete';job.message='FF14 材质转换完成';}else{job.status='failed';job.message=lastError||'材质转换失败，请检查是否选择完整导出文件夹。';}running=false;runNext();}
  process.on('error',()=>{lastError='无法启动本机 Blender。';finish(1);});process.on('close',finish);
}
module.exports=async function handle(req,res,url){if(!url.pathname.startsWith('/api/conversions'))return false;
  const origin=req.headers.origin;if(origin&&![`http://127.0.0.1:${process.env.PORT||8773}`,`http://localhost:${process.env.PORT||8773}`].includes(origin)){send(res,403,{error:'只接受本机工作台请求'});return true;}
  try{
    if(url.pathname==='/api/conversions'&&req.method==='POST'){
      const data=await jsonBody(req),modelPath=relative(data.modelPath);if(!/\.(gltf|glb)$/i.test(modelPath))throw Error('只支持 glTF 或 GLB');
      if(!Array.isArray(data.files)||!data.files.length||data.files.length>4000)throw Error('请选择完整的导出文件夹');
      let total=0;const files=new Map();for(const entry of data.files){const p=relative(entry.path);if(!Number.isSafeInteger(entry.size)||entry.size<0||entry.size>256*1024*1024||files.has(p))throw Error('文件无效或过大');files.set(p,entry.size);total+=entry.size;}
      if(total>1024*1024*1024)throw Error('导出文件夹超过 1 GB');if(!files.has(modelPath))throw Error('缺少模型文件');
      const id=crypto.randomUUID(),dir=path.join(base,id),input=path.join(dir,'input');await fsp.mkdir(input,{recursive:true});const job={id,dir,input,modelPath,files,received:new Set(),status:'uploading',message:'正在接收本机导出文件…'};jobs.set(id,job);send(res,201,publicJob(job));return true;
    }
    const match=url.pathname.match(/^\/api\/conversions\/([0-9a-f-]{36})(?:\/(files|start))?$/);if(!match){send(res,404,{error:'转换任务不存在'});return true;}
    const job=jobs.get(match[1]);if(!job){send(res,404,{error:'转换任务不存在，请重新导入'});return true;}
    if(req.method==='GET'&&!match[2]){send(res,200,publicJob(job));return true;}
    if(req.method==='PUT'&&match[2]==='files'){
      if(job.status!=='uploading')throw Error('任务已开始转换');const name=relative(url.searchParams.get('path'));if(!job.files.has(name))throw Error('文件未在清单中');
      const expected=job.files.get(name),dest=path.resolve(job.input,name);if(!dest.startsWith(job.input+path.sep))throw Error('文件路径不合法');
      let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>expected)throw Error('文件大小不匹配');chunks.push(chunk);}if(size!==expected)throw Error('文件传输不完整');await fsp.mkdir(path.dirname(dest),{recursive:true});await fsp.writeFile(dest,Buffer.concat(chunks));job.received.add(name);send(res,200,{received:job.received.size});return true;
    }
    if(req.method==='POST'&&match[2]==='start'){
      if(job.status!=='uploading')throw Error('转换已开始');if(job.received.size!==job.files.size)throw Error('导出文件尚未传输完整');
      const bytes=await fsp.readFile(path.join(job.input,job.modelPath));const doc=/\.gltf$/i.test(job.modelPath)?JSON.parse(bytes.toString('utf8')):JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
      for(const item of [...(doc.buffers||[]),...(doc.images||[])])if(item.uri&&!item.uri.startsWith('data:')){const uri=relative(decodeURIComponent(item.uri));const dest=path.resolve(job.input,path.dirname(job.modelPath),uri);if(!dest.startsWith(job.input+path.sep)||!fs.existsSync(dest))throw Error('缺少模型资源：'+item.uri);}
      job.status='queued';job.message='等待本机材质转换…';queue.push(job);runNext();send(res,202,publicJob(job));return true;
    }
    send(res,405,{error:'不支持的操作'});return true;
  }catch(error){send(res,400,{error:error.message||'转换请求失败'});return true;}
};
