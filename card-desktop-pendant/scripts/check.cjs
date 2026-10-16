const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const project=path.resolve(__dirname,'..');let checked=0;
for(const dir of ['app','renderer','scripts','test','core'])for(const name of fs.readdirSync(path.join(project,dir))){if(!/\.(cjs|js)$/.test(name))continue;const file=path.join(project,dir,name),esm=name.endsWith('.js');const result=spawnSync(process.execPath,esm?['--input-type=module','--check']:['--check',file],{input:esm?fs.readFileSync(file):undefined,encoding:'utf8'});if(result.status!==0){process.stderr.write(result.stderr);process.exit(1);}checked++;}
console.log(`Syntax checked ${checked} modules.`);
