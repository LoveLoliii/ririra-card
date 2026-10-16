const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),folder=path.join(root,'dist/Ririra-Card-Pendant-Lite-0.3.0');
fs.mkdirSync(folder,{recursive:true});
for(const [from,to]of [['dist/Ririra-Card-Pendant-Lite-0.3.0-Windows.exe','Ririra-Card-Pendant-Lite.exe'],['LICENSE','LICENSE'],['THIRD_PARTY_NOTICES.md','THIRD_PARTY_NOTICES.md']])fs.copyFileSync(path.join(root,from),path.join(folder,to));
fs.writeFileSync(path.join(folder,'使用说明.txt'),'Ririra 桌面闪卡 Lite 0.3.0\r\n\r\n运行 Ririra-Card-Pendant-Lite.exe，点击 ＋ 导入 .ririra 卡片。\r\n拖动卡面旋转，滚轮缩放；拖动顶部 ⠿ 移动挂件。\r\n菜单或托盘可设置置顶、大小、锁定、隐藏和开机启动（默认关闭）。\r\nCtrl+Alt+C 显示并解锁；重开时恢复位置与卡片。\r\n需要 Windows 10/11 和 Microsoft Edge WebView2 Runtime；缺少时会提示官方下载。\r\n程序和卡片缓存分开保存，.ririra 卡片请另行提供。\r\n\r\n源代码遵循 AGPL-3.0-or-later。本项目源码位置：card-desktop-pendant/src-tauri、core 和 renderer。\r\n分享二进制时请同时提供对应源代码及许可证。\r\n');
const cargoDir=process.env.CARGO_HOME||path.join(process.env.USERPROFILE,'.cargo'),registry=path.join(cargoDir,'registry/src');
const sources=fs.readdirSync(registry).map(n=>path.join(registry,n));
const lock=fs.readFileSync(path.join(root,'src-tauri/Cargo.lock'),'utf8'),notices=[];
for(const part of lock.split('[[package]]').slice(1)){
  const name=/^name = "([^"]+)"/m.exec(part)?.[1],version=/^version = "([^"]+)"/m.exec(part)?.[1];
  const dir=sources.map(p=>path.join(p,`${name}-${version}`)).find(p=>fs.existsSync(p));if(!dir)continue;
  for(const file of fs.readdirSync(dir)){if(!/^(licen[cs]e|copying|copyright|notice)([._-]|$)/i.test(file)||!fs.statSync(path.join(dir,file)).isFile())continue;notices.push(`\n${'='.repeat(72)}\n${name} ${version} / ${file}\n${'='.repeat(72)}\n${fs.readFileSync(path.join(dir,file),'utf8')}`);}
}
fs.writeFileSync(path.join(folder,'RUST_DEPENDENCY_LICENSES.txt'),notices.join('\n'));
const source=path.join(folder,'source');fs.mkdirSync(source,{recursive:true});
for(const name of ['core','renderer','assets','scripts','app','test'])fs.cpSync(path.join(root,name),path.join(source,name),{recursive:true});
const native=path.join(root,'src-tauri');fs.cpSync(native,path.join(source,'src-tauri'),{recursive:true,filter:p=>!['target','gen'].includes(path.relative(native,p).split(path.sep)[0])});
for(const name of ['package.json','package-lock.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md'])fs.copyFileSync(path.join(root,name),path.join(source,name));
console.log('Prepared Lite distribution folder: '+folder);
