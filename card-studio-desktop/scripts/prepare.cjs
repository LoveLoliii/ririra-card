const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const project=path.resolve(__dirname,'..'),root=path.dirname(project),web=path.join(project,'web');fs.mkdirSync(web,{recursive:true});
function componentStyles(){
  const rules=[];
  for(const name of fs.readdirSync(web).filter(n=>n.endsWith('.js'))){
    const source=fs.readFileSync(path.join(web,name),'utf8');
    for(const match of source.matchAll(/\b(?:css|style)\.textContent\s*=\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")/gs)){
      const css=vm.runInNewContext(match[1],Object.create(null),{timeout:100});
      if(typeof css==='string'&&css.includes('{'))rules.push(`/* ${name} */\n${css}`);
    }
  }
  if(rules.length<8)throw Error('Missing embedded component styles');
  fs.writeFileSync(path.join(web,'component-styles.css'),rules.join('\n'));
  console.log(`Bundled ${rules.length} component stylesheets as a static asset`);
}
if(fs.existsSync(path.join(project,'frontend'))&&!fs.existsSync(path.join(root,'opensource/ririra-card/realtime-viewer.js'))){fs.cpSync(path.join(project,'frontend'),web,{recursive:true});for(const name of ['studio.js','studio.css','studio-controls.css','studio-panels.js'])fs.copyFileSync(path.join(project,name),path.join(web,name));componentStyles();console.log('Prepared included frontend source');process.exit(0);}
for(const name of fs.readdirSync(root))if(/\.(js|css)$/.test(name))fs.copyFileSync(path.join(root,name),path.join(web,name));
for(const name of ['vendor','ririra-format'])fs.cpSync(path.join(root,name),path.join(web,name),{recursive:true});
// Reuse the public renderer's procedural demo instead of embedding private game assets.
for(const name of ['realtime-viewer.js','demo-assets.js'])fs.copyFileSync(path.join(root,'opensource/ririra-card',name),path.join(web,name));
let viewer=fs.readFileSync(path.join(web,'realtime-viewer.js'),'utf8').replace('renderer:()=>renderer,applyRiriraView','renderer:()=>renderer,captureRirira,applyRiriraView');fs.writeFileSync(path.join(web,'realtime-viewer.js'),viewer);
let importer=fs.readFileSync(path.join(web,'model-import.js'),'utf8');
importer=importer.replace("choice.onchange=()=>loadSelected(+choice.value);","window.studioImporter={selectFiles};choice.onchange=()=>loadSelected(+choice.value);");fs.writeFileSync(path.join(web,'model-import.js'),importer);
let html=fs.readFileSync(path.join(root,'opensource/ririra-card/index-realtime.html'),'utf8').replace('src="./realtime-viewer.js"','src="./studio.js"').replace('<head>','<head><link rel="stylesheet" href="./component-styles.css"><link rel="stylesheet" href="./studio.css"><link rel="stylesheet" href="./studio-controls.css">');fs.writeFileSync(path.join(web,'index.html'),html);
for(const name of ['studio.js','studio.css','studio-controls.css','studio-panels.js'])fs.copyFileSync(path.join(project,name),path.join(web,name));
componentStyles();
const list=[];
function nativeFile(src,relative){if(/__pycache__|\.pyc$|\.git([\\/]|$)/.test(src))return;if(fs.statSync(src).isDirectory()){for(const name of fs.readdirSync(src))nativeFile(path.join(src,name),relative+'/'+name);}else{const dest=path.join(web,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);list.push(relative);}}
for(const file of ['prepare_imported_ff14.py','export_realtime_assets.py','mark_baked_gltf.py'])nativeFile(path.join(root,'scripts',file),'scripts/'+file);
nativeFile(path.join(root,'card-desktop-pendant/core/tools/MeddleTools-main'),'tools/MeddleTools-main');
fs.writeFileSync(path.join(web,'native-files.json'),JSON.stringify(list));
console.log('Prepared A studio renderer and native conversion assets');
