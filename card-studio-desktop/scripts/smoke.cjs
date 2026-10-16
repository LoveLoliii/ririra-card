const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'output/qa',String(Date.now())),profile=path.join(folder,'profile');fs.mkdirSync(folder,{recursive:true});
const exe=path.join(folder,'Ririra-Studio.exe');fs.copyFileSync(path.join(root,'dist/Ririra-Card-Studio-0.1.0-Windows.exe'),exe);
const model=process.argv[2]?path.resolve(process.argv[2]):null;
const result=spawnSync(exe,['--smoke-test','--test-profile',profile,...(model?['--test-model',model]:[])],{cwd:folder,encoding:'utf8',timeout:600000});
if(result.status!==0)console.error(result.stdout,result.stderr,fs.existsSync(path.join(profile,'studio.log'))?fs.readFileSync(path.join(profile,'studio.log'),'utf8'):'No runtime log');
assert.equal(result.status,0,'Studio smoke test must finish');
const state=JSON.parse(fs.readFileSync(path.join(profile,'smoke-result.json'),'utf8'));assert.equal(state.ready,true);assert.equal(state.webgl,true);assert.ok(state.meshCount>0);
assert.equal(state.layout.defaultCollapsed,true);assert.equal(state.layout.groupCount,9);assert.ok(state.layout.pageHeight<=state.layout.viewportHeight+1);assert.equal(state.layout.background.thumbnailFit,'contain');assert.ok(state.layout.background.contentWidth<=state.layout.background.gridWidth+1);assert.ok(state.layout.background.thumbnailHeight>state.layout.background.thumbnailWidth);
assert.equal(state.layout.controlStyles.lightingColumns,2);assert.ok(state.layout.controlStyles.textInputHeight>=34);assert.equal(state.layout.controlStyles.textLabelAbove,true);assert.equal(state.layout.controlStyles.gifLabelAbove,true);assert.ok(state.layout.controlStyles.gifSelectHeight>=34);assert.equal(state.layout.controlStyles.switchAppearance,'none');
if(model)assert.equal(state.modelName,path.basename(model),'Requested model must have loaded successfully');
const exportsDir=path.join(profile,'exports'),files=fs.readdirSync(exportsDir),find=ext=>path.join(exportsDir,files.find(n=>n.endsWith(ext))||'MISSING'+ext);
const png=fs.readFileSync(find('.png'));assert.equal(png.readUInt32BE(16),720);assert.equal(png.readUInt32BE(20),1080);
const gif=fs.readFileSync(find('.gif'));assert.match(gif.subarray(0,6).toString(),/^GIF8[79]a$/);assert.equal(gif.readUInt16LE(6),360);assert.equal(gif.readUInt16LE(8),540);
(async()=>{
  const shared=path.join(root,'../ririra-format/format.js');
  const format=await import(pathToFileURL(fs.existsSync(shared)?shared:path.join(root,'web/ririra-format/format.js')));
  const packed=await format.readRirira(new Blob([fs.readFileSync(find('.ririra'))]));
  let BImportedTitle=null;const importer=path.join(root,'../card-desktop-pendant/app/card-store.cjs');
  if(fs.existsSync(importer)){const cached=await require(importer).importCard(path.join(folder,'B-cache'),find('.ririra'));assert.equal(cached.manifest.title,packed.manifest.title);BImportedTitle=cached.manifest.title;}
  const report={passed:true,exeBytes:fs.statSync(exe).size,state,exports:files,card:find('.ririra'),BImportedTitle,screenshot:path.join(profile,'smoke.png')};
  fs.writeFileSync(path.join(folder,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
