const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||8773);
const conversionApi=require('./conversion-api.cjs');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.cjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.mp4':'video/mp4','.glb':'model/gltf-binary','.svg':'image/svg+xml','.wasm':'application/wasm'};
const server=http.createServer(async(req,res)=>{
  const requestUrl=new URL(req.url,'http://localhost');if(await conversionApi(req,res,requestUrl))return;
  let rel;try{rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
  if(rel==='/')rel='/index-realtime.html';
  if(rel.split('/').some(part=>part.startsWith('.'))){res.writeHead(403);return res.end();}
  const file=path.resolve(root,'.'+rel);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);return res.end('Not found');}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':st.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);
  });
});
server.on('error',e=>{if(e.code==='EADDRINUSE'){console.log('The card viewer is already running.');process.exit(0);}throw e;});
server.listen(port,'127.0.0.1',()=>console.log(`Card viewer: http://127.0.0.1:${port}/index-realtime.html`));
