const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'web-lite');
fs.mkdirSync(out,{recursive:true});
for(const name of ['core','renderer'])fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true});
// The exact same renderer and assets are embedded in the native EXE.
let html=fs.readFileSync(path.join(root,'core/index-realtime.html'),'utf8');
html=html.replace('src="./realtime-viewer.js"','src="/renderer/adapter.js"').replace('<head>','<head><base href="/core/"><link rel="stylesheet" href="/renderer/pendant.css">');
fs.writeFileSync(path.join(out,'index.html'),html);
console.log('Prepared shared renderer for WebView2');
