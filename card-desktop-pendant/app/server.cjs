const http=require('node:http'),fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),crypto=require('node:crypto');
const {readModel}=require('./model-store.cjs');
const {readActiveCard}=require('./card-store.cjs');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif','.glb':'model/gltf-binary','.bin':'application/octet-stream','.wasm':'application/wasm','.svg':'image/svg+xml'};
function contained(base,relative){if(relative.split('/').some(p=>p.startsWith('.')))return null;const file=path.resolve(base,relative);return file.startsWith(path.resolve(base)+path.sep)?file:null;}
async function createServer({project,dataDir,port=0}){
  const core=path.join(project,'core'),native=false;
  process.env.CARD_OUTPUT_DIR=path.join(dataDir,'output');
  const convert=require(path.join(core,'scripts/conversion-api.cjs'));
  const server=http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');const origin=req.headers.origin;
      if(origin&&origin!==`http://${req.headers.host}`){res.writeHead(403);return res.end('Local requests only');}
      if(url.pathname.startsWith('/api/conversions')){await convert(req,res,url);return;}
      const json=value=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
      if(url.pathname==='/api/builtin')return json({native,modelName:native?'本机角色':'原创水晶示例'});
      if(url.pathname==='/api/saved-model')return json(await readModel(dataDir));
      if(url.pathname==='/api/active-card')return json(await readActiveCard(dataDir));
      let relative;try{relative=decodeURIComponent(url.pathname).slice(1);}catch{res.writeHead(400);return res.end();}
      if(!relative||relative==='index.html'){
        const nonce=crypto.randomBytes(18).toString('base64');
        let html=await fsp.readFile(path.join(core,'index-realtime.html'),'utf8');
        html=html.replace('src="./realtime-viewer.js"','src="/renderer/adapter.js"').replace('<head>','<head><link rel="stylesheet" href="/renderer/pendant.css">').replaceAll('<script',`<script nonce="${nonce}"`);
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`default-src 'self'; script-src 'self' 'nonce-${nonce}' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'`});return res.end(html);
      }
      let file;
      if(relative.startsWith('renderer/'))file=contained(project,relative);
      else if(relative.startsWith('core/'))file=contained(core,relative.slice(5));
      else if(relative.startsWith('card-assets/'))file=contained(path.join(dataDir,'cards'),relative.slice(12));
      else if(relative.startsWith('saved-models/'))file=contained(path.join(dataDir,'models'),relative.slice(13));
      else if(relative.startsWith('output/conversions/'))file=contained(path.join(dataDir,'output'),relative.slice(7));
      else file=contained(core,relative);
      if(!file){res.writeHead(403);return res.end('Forbidden');}
      const stat=await fsp.stat(file);if(!stat.isFile()){res.writeHead(404);return res.end();}
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);
    }catch(error){res.writeHead(error.code==='ENOENT'?404:500);res.end(error.code==='ENOENT'?'Not found':'Local server error');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  const actualPort=server.address().port;process.env.PORT=String(actualPort);return {server,url:`http://127.0.0.1:${actualPort}`,native};
}
module.exports={createServer,contained};
