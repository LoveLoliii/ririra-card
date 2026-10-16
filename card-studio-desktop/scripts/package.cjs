const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/Ririra-Card-Studio-0.1.0'),source=path.join(out,'source');fs.mkdirSync(source,{recursive:true});
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md','README.md','FF14模型导出说明.txt'])fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.copyFileSync(path.join(root,'dist/Ririra-Card-Studio-0.1.0-Windows.exe'),path.join(out,'Ririra-Card-Studio.exe'));
for(const name of ['scripts','assets','web'])fs.cpSync(path.join(root,name),path.join(source,name==='web'?'frontend':name),{recursive:true});
const native=path.join(root,'src-tauri');fs.cpSync(native,path.join(source,'src-tauri'),{recursive:true,filter:p=>!['target','gen'].includes(path.relative(native,p).split(path.sep)[0])});
for(const name of ['studio.js','studio.css','studio-controls.css','studio-panels.js','package.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md'])fs.copyFileSync(path.join(root,name),path.join(source,name));
const licenses=path.join(path.dirname(root),'card-desktop-pendant/dist/Ririra-Card-Pendant-Lite-0.3.0/RUST_DEPENDENCY_LICENSES.txt');if(fs.existsSync(licenses))fs.copyFileSync(licenses,path.join(out,'RUST_DEPENDENCY_LICENSES.txt'));
console.log('Packaged A desktop studio with source and licenses');
