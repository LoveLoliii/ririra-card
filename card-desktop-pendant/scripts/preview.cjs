const path=require('node:path'),{createServer}=require('../app/server.cjs');
const project=path.resolve(__dirname,'..');
createServer({project,dataDir:path.join(project,'output/browser-preview'),port:Number(process.env.PORT||18774)}).then(({url,native})=>console.log(`Preview: ${url}/index.html?mode=pendant\nEditor: ${url}/index.html?mode=editor\nLocal character: ${native}`));
