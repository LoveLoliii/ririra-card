const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),exe=path.join(root,'dist/Ririra-Card-Pendant-Lite-0.3.0-Windows.exe');
const folder=path.join(root,'output/lite-qa',String(Date.now())),profile=path.join(folder,'profile');
fs.mkdirSync(profile,{recursive:true});
const isolatedExe=path.join(folder,'Ririra-Lite.exe');fs.copyFileSync(exe,isolatedExe);
const bounds={x:119,y:173,width:340,height:510};
fs.writeFileSync(path.join(profile,'settings.json'),JSON.stringify({windowPhysical:bounds,visible:false,card:{}}));
const sample=process.argv[2],source=sample?path.join(folder,'sample.ririra'):null;
if(source)fs.copyFileSync(path.resolve(sample),source);
const results=[];
for(let i=0;i<2;i++){
  const args=['--smoke-test','--test-profile',profile,...(i===0&&source?[source]:[])];
  const child=spawnSync(isolatedExe,args,{cwd:folder,encoding:'utf8',timeout:90000});
  if(child.status!==0)console.error(child.stdout,child.stderr,fs.existsSync(path.join(profile,'lite-runtime.log'))?fs.readFileSync(path.join(profile,'lite-runtime.log'),'utf8'):'No runtime log');
  assert.equal(child.status,0,'Native app must finish smoke test');
  const result=JSON.parse(fs.readFileSync(path.join(profile,'smoke-result.json'),'utf8'));
  assert.equal(result.ready,true);assert.ok(result.meshCount>0);assert.equal(result.webgl,true);assert.equal(result.pageTransparent,true);assert.equal(result.autoStart,false);assert.deepEqual(result.bounds,bounds);
  const settings=JSON.parse(fs.readFileSync(path.join(profile,'settings.json'),'utf8'));assert.equal(settings.visible,true);assert.deepEqual(settings.windowPhysical,bounds);
  results.push(result);
  if(i===0&&source)fs.unlinkSync(source);
}
assert.equal(results[0].meshCount,results[1].meshCount);
const bytes=fs.statSync(exe).size;
assert.ok(bytes<10*1000*1000,'Release EXE must be smaller than 10 MB (decimal)');
fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify({bytes,MiB:bytes/1048576,results},null,2));
console.log(JSON.stringify({passed:true,bytes,MiB:bytes/1048576,report:path.join(folder,'verification.json'),screenshot:path.join(profile,'smoke.png')},null,2));
