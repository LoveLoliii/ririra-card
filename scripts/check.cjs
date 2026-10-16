const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');let count=0;
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.js'))){
  const result=spawnSync(process.execPath,['--input-type=module','--check'],{input:fs.readFileSync(path.join(root,name)),encoding:'utf8'});
  if(result.status!==0){process.stderr.write(result.stderr);process.exit(1);}count++;
}
for(const name of fs.readdirSync(__dirname).filter(n=>n.endsWith('.cjs'))){
  const result=spawnSync(process.execPath,['--check',path.join(__dirname,name)],{encoding:'utf8'});
  if(result.status!==0){process.stderr.write(result.stderr);process.exit(1);}count++;
}
console.log(`Syntax checked ${count} JavaScript modules.`);
