const fs=require('node:fs'),path=require('node:path');
const defaults={alwaysOnTop:true,autoStart:false,locked:false,visible:true,bounds:null,card:{}};
function readSettings(file){try{const v=JSON.parse(fs.readFileSync(file,'utf8'));return {...defaults,...v,locked:false,visible:true,card:v.card||{}};}catch{return {...defaults,card:{}};}}
function writeSettings(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temporary=file+'.tmp';fs.writeFileSync(temporary,JSON.stringify(value,null,2));fs.renameSync(temporary,file);}
function fitBounds(bounds,area){const width=Math.min(Math.max(Math.round(bounds?.width||340),240),Math.min(720,area.width));const height=Math.min(Math.max(Math.round(bounds?.height||510),360),area.height);return {width,height,x:Math.round(Math.max(area.x,Math.min(bounds?.x??area.x+area.width-width-30,area.x+area.width-width))),y:Math.round(Math.max(area.y,Math.min(bounds?.y??area.y+area.height-height-30,area.y+area.height-height)))};}
function safeCardState(value){if(!value||typeof value!=='object'||Array.isArray(value))return {};const result={};for(const [key,item]of Object.entries(value))if(key.startsWith('card.')&&typeof item==='string'&&key.length<100&&item.length<20000)result[key]=item;return result;}
module.exports={readSettings,writeSettings,fitBounds,safeCardState};
