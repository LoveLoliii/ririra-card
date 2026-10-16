import * as THREE from './vendor/three/three.module.js';

export const framePresets=[
  ['classic','原始粉金','原始边框','保留原有的粉金双线与圆角。','#cfa697','#fff0d5'],
  ['champagne','香槟金箔','典藏工艺','细金边、扇形刻线与菱形铆点。','#d9bf83','#fff0c8'],
  ['rosegold','玫瑰雕花','典藏工艺','粉金卷草、玫瑰角花与镂空弧线。','#d7a0ac','#f3d4c5'],
  ['mithril','秘银细线','典藏工艺','银蓝平行细线和简洁的切角。','#b6cedc','#f1f8fc'],
  ['obsidian','曜黑鎏金','典藏工艺','深黑底衬、金色阶梯和装饰艺术纹样。','#c7ab6c','#ead6a1'],
  ['pearl','珍珠珐琅','典藏工艺','柔白珐琅花瓣和间隔珍珠。','#d8d5d6','#f5ecdf'],
  ['crystaltower','水晶塔棱晶','水晶科技','蓝紫棱晶与折射般的折线边。','#9ebbdc','#dacaff'],
  ['hydaelynwing','母水晶辉翼','水晶科技','浅蓝翼片和对称的水晶羽冠。','#a1d9e8','#e3f7ff'],
  ['zodiac','占星黄道','水晶科技','黄铜刻度、小星点和旋转仪器式角环。','#d7bf8a','#e2d5f3'],
  ['solutionnine','九号光路','水晶科技','紫青电路、断续光条和节点。','#b2a0eb','#9ddfeb'],
  ['allagan','亚拉戈几何','水晶科技','赤蓝能量菱片与六角嵌件。','#b2c3d4','#e6a5ac'],
  ['forestvine','黑衣森藤','自然秘境','绿色细藤与沿卡缘伸展的叶片。','#9cb799','#d6ddac'],
  ['faeflowers','妖精花枝','自然秘境','紫粉小花、纤细花梗和蝴蝶角饰。','#c8abd9','#f3c9df'],
  ['frostcrown','冰神霜冠','自然秘境','六角雪晶、对称冰针与银蓝刻纹。','#b5d5e6','#ebf8ff'],
  ['coralreef','红玉海珊瑚','自然秘境','珊瑚枝、贝壳扇纹和海珠。','#d6a4a2','#b8ded4'],
  ['moonflower','月读彼岸','自然秘境','黑白月牙、绯红花丝与扇面弧纹。','#c7b9d6','#dfa2b3'],
  ['dragonwing','龙诗翼纹','战技传说','苍蓝龙翼、尖鳞与交叠的翼骨线。','#a6c7e1','#e0dfd2'],
  ['katana','武士刀镡','战技传说','深红编绳、金色刀镡和折角护边。','#c5aa82','#d7a0a1'],
  ['darkthorns','暗黑尖棘','战技传说','黑紫荆棘、银色尖角与暗红宝石。','#ad91b4','#d89cae'],
  ['viperedge','蝰蛇双锋','战技传说','绿金双轨、蛇鳞刻线与对向刃尖。','#a4c7aa','#e1c68e'],
  ['paintstroke','绘灵彩边','战技传说','彩色短笔触、颜料点与星形转角。','#d5b5db','#b4d6df']
];

function drawFrame(id,width=1024,strength=1){
  const preset=framePresets.find(p=>p[0]===id),[,,,,primary,secondary]=preset;
  const c=document.createElement('canvas');c.width=width;c.height=Math.round(width*1.5);const x=c.getContext('2d');x.scale(width/1024,width/1024);x.globalAlpha=strength;
  const line=(p,color=primary,w=1.8)=>{x.strokeStyle=color;x.lineWidth=w;x.beginPath();p.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke();};
  const poly=(p,fill,stroke=primary,w=1.4)=>{x.beginPath();p.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();if(fill){x.fillStyle=fill;x.fill();}if(stroke){x.strokeStyle=stroke;x.lineWidth=w;x.stroke();}};
  const dot=(a,b,r,color=secondary)=>{x.fillStyle=color;x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.fill();};
  const ring=(a,b,r,color=primary)=>{x.strokeStyle=color;x.lineWidth=1.4;x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.stroke();};
  const rounded=(inset,r=25,w=2,color=primary)=>{x.strokeStyle=color;x.lineWidth=w;x.beginPath();x.roundRect(inset,inset,1024-inset*2,1536-inset*2,r);x.stroke();};
  const corner=fn=>{for(const [a,b,fx,fy]of [[0,0,1,1],[1024,0,-1,1],[0,1536,1,-1],[1024,1536,-1,-1]]){x.save();x.translate(a,b);x.scale(fx,fy);fn();x.restore();}};
  const leaf=(a,b,size,angle,color=secondary)=>{x.save();x.translate(a,b);x.rotate(angle);x.fillStyle=color;x.beginPath();x.moveTo(0,0);x.bezierCurveTo(-size*.5,-size*.3,-size*.4,-size,0,-size);x.bezierCurveTo(size*.5,-size*.8,size*.6,-size*.2,0,0);x.fill();x.restore();};
  const jewel=(a,b,s,color=secondary)=>{poly([[a,b-s],[a+s*.55,b],[a,b+s], [a-s*.55,b]],color,primary);line([[a,b-s],[a,b+s]],'#ffffff70',1);};
  const bloom=(a,b,r,color=secondary,n=5)=>{for(let i=0;i<n;i++)leaf(a,b,r,i*Math.PI*2/n,color);dot(a,b,2.4,primary);};
  // Thin printed rim: no walls or deep inset box.
  const g=x.createLinearGradient(0,0,1024,1536);g.addColorStop(0,primary+'1c');g.addColorStop(.45,secondary+'06');g.addColorStop(1,primary+'18');x.fillStyle=g;x.beginPath();x.roundRect(5,5,1014,1526,24);x.roundRect(29,29,966,1478,20);x.fill('evenodd');
  if(id==='classic'){rounded(25,32,3);rounded(45,22,1.2,secondary+'70');return c;}
  rounded(13,23,2,primary+'d0');
  if(id==='champagne'){
    rounded(35,18,1.3);corner(()=>{line([[23,115],[23,23],[115,23]],primary,3);for(let i=0;i<6;i++){const a=i*Math.PI/12;line([[30+Math.cos(a)*22,30+Math.sin(a)*22],[30+Math.cos(a)*60,30+Math.sin(a)*60]],primary+'b0');}jewel(32,32,8);});for(const a of [22,1002])for(let b=180;b<1400;b+=112)jewel(a,b,4,primary+'b0');
  }else if(id==='rosegold'){
    rounded(38,28,1.2,primary+'80');corner(()=>{for(let i=0;i<3;i++){x.beginPath();x.moveTo(24,105-i*16);x.bezierCurveTo(75-i*10,100-i*24,20+i*6,30+i*10,96-i*16,24);x.strokeStyle=primary;x.lineWidth=1.8;x.stroke();}bloom(42,42,15,secondary+'c0',6);leaf(30,82,24,-.2,primary+'90');leaf(82,30,24,1.7,primary+'90');});
  }else if(id==='mithril'){
    line([[25,125],[25,55],[55,25],[969,25],[999,55],[999,1481],[969,1511],[55,1511],[25,1481],[25,125]],primary,2);line([[39,130],[39,62],[62,39],[962,39],[985,62],[985,1474],[962,1497],[62,1497],[39,1474],[39,130]],secondary+'a0',1);corner(()=>{line([[22,80],[80,22]],secondary,2.5);line([[22,95],[95,22]],primary+'70');});
  }else if(id==='obsidian'){
    rounded(30,3,5,'#1b1923');rounded(35,3,1.8);corner(()=>{for(let i=0;i<4;i++)line([[20+i*8,115-i*16],[20+i*8,20+i*8],[115-i*16,20+i*8]],primary,2);poly([[48,27],[69,48],[48,69],[27,48]],'#302c2a',secondary);});for(const a of [22,1002])for(let b=220;b<1360;b+=145)line([[a,b-20],[a+4,b],[a,b+20],[a-4,b]],primary+'80');
  }else if(id==='pearl'){
    rounded(34,32,2,primary+'a0');corner(()=>{for(let i=0;i<5;i++)leaf(32,32,42,i*Math.PI/8+.2,secondary+'65');ring(34,34,12);dot(34,34,7);});for(const a of [23,1001])for(let b=150;b<1400;b+=72){dot(a,b,3.8,secondary+'d0');dot(a-1,b-1,1.2,'#ffffff');}
  }else if(id==='crystaltower'){
    rounded(35,8,1.2);corner(()=>{jewel(40,40,30,secondary+'60');jewel(32,90,21,primary+'60');jewel(90,32,21,primary+'60');line([[20,135],[34,113],[20,100],[34,77]],primary+'b0');});for(const a of [22,1002])for(let b=220;b<1360;b+=105)jewel(a,b,10,primary+'60');
  }else if(id==='hydaelynwing'){
    rounded(36,35,1.1);corner(()=>{for(let i=0;i<7;i++)leaf(27+i*7,27+i*7,60-i*5,-Math.PI/4, i%2?primary+'a0':secondary+'80');jewel(30,30,13,secondary+'90');});for(const a of [22,1002])for(let b=270;b<1300;b+=140){line([[a,b-28],[a+5,b],[a,b+28],[a-5,b]],secondary+'90');}
  }else if(id==='zodiac'){
    rounded(38,29,1.1,secondary+'70');corner(()=>{ring(40,40,22);ring(40,40,30,primary+'90');for(let i=0;i<12;i++){const a=i*Math.PI/6;line([[40+Math.cos(a)*24,40+Math.sin(a)*24],[40+Math.cos(a)*29,40+Math.sin(a)*29]],secondary);}jewel(40,40,12,primary+'70');});for(const a of [23,1001])for(let b=150;b<1420;b+=28)line([[a,b],[a+(b%56?4:8)*(a<512?1:-1),b]],primary+'90');
  }else if(id==='solutionnine'){
    corner(()=>{line([[20,135],[20,88],[34,74],[34,35],[75,35],[89,20],[135,20]],secondary,2.4);poly([[34,34],[51,34],[51,51],[34,51]],primary+'70',primary);});for(const side of [-1,1]){const a=side<0?23:1001;for(let i=0;i<8;i++){const b=180+i*153;line([[a,b],[a-side*12,b+12],[a-side*12,b+70],[a,b+82]],i%2?primary:secondary,2);dot(a-side*12,b+12,2.7,secondary);}}for(const b of [24,1512])for(let a=230;a<820;a+=85)line([[a,b],[a+44,b]],secondary+'b0',3);
  }else if(id==='allagan'){
    rounded(34,4,1.5);corner(()=>{poly([[28,48],[28,27],[48,16],[69,27],[69,48],[48,61]],'#202433',primary,2);jewel(48,37,14,secondary+'a0');line([[24,120],[24,90],[42,72],[60,72]],secondary+'b0',2);});for(const a of [23,1001])for(let b=210;b<1380;b+=120){poly([[a,b-13],[a+9,b-7],[a+9,b+7],[a,b+13],[a-9,b+7],[a-9,b-7]],primary+'2b',primary+'b0');}
  }else if(id==='forestvine'){
    rounded(34,35,1.1,primary+'70');corner(()=>{x.beginPath();x.moveTo(26,150);x.bezierCurveTo(66,70,2,25,150,26);x.strokeStyle=primary;x.lineWidth=2.6;x.stroke();for(let i=0;i<5;i++){leaf(28+i*8,95-i*15,23,-.6+i*.18,secondary+'90');leaf(95-i*15,28+i*8,22,1.9-i*.18,primary+'b0');}});for(const a of [22,1002])for(let b=240;b<1350;b+=140){leaf(a,b,23,a<512?.2:-.2,primary+'70');}
  }else if(id==='faeflowers'){
    rounded(35,38,1.2,primary+'80');corner(()=>{x.beginPath();x.moveTo(25,140);x.quadraticCurveTo(75,75,140,25);x.strokeStyle=primary;x.lineWidth=1.6;x.stroke();bloom(42,42,17,secondary+'c0');bloom(28,94,10,primary+'a0');bloom(94,28,10,primary+'a0');leaf(58,72,15,-.8,secondary+'80');leaf(72,58,15,2.4,secondary+'80');});for(const a of [23,1001])for(let b=300;b<1300;b+=190)bloom(a,b,7,secondary+'b0');
  }else if(id==='frostcrown'){
    rounded(36,5,1.3,primary+'90');corner(()=>{x.save();x.translate(43,43);for(let i=0;i<6;i++){x.rotate(Math.PI/3);line([[0,0],[0,-29]],secondary,1.7);line([[-9,-22],[0,-13],[9,-22]],primary,1.4);}x.restore();for(let i=0;i<3;i++){jewel(25,105+i*36,15-i*2,primary+'65');jewel(105+i*36,25,15-i*2,primary+'65');}});for(const a of [22,1002])for(let b=330;b<1250;b+=130)jewel(a,b,6,secondary+'90');
  }else if(id==='coralreef'){
    rounded(36,35,1.1,secondary+'80');corner(()=>{for(let i=0;i<6;i++){const a=25+i*11;line([[25,110],[a,60],[a+7,30]],primary+'b0',2);line([[110,25],[60,a],[30,a+7]],secondary+'90',1.3);}dot(40,40,5,secondary);dot(28,125,3);dot(125,28,3);});for(const a of [23,1001])for(let b=250;b<1350;b+=140){dot(a,b,3.2,secondary+'b0');leaf(a,b+30,15,a<512?.4:-.4,primary+'90');}
  }else if(id==='moonflower'){
    rounded(35,30,1.1);corner(()=>{dot(42,42,23,secondary+'7a');dot(51,36,21,'#242132');for(let i=0;i<6;i++){x.beginPath();x.moveTo(30,115);x.bezierCurveTo(55-i*6,70-i*3,15+i*12,65,30+i*8,84);x.strokeStyle=secondary+'b0';x.lineWidth=1.4;x.stroke();}for(let i=0;i<6;i++)line([[80,27],[104+i*7,27+i*6]],primary+'90');});for(const a of [23,1001])for(let b=350;b<1250;b+=190)ring(a,b,5,secondary+'90');
  }else if(id==='dragonwing'){
    rounded(37,8,1.1,primary+'90');corner(()=>{poly([[25,125],[25,25],[125,25],[93,42],[100,65],[65,58],[58,88],[43,81]],primary+'32',primary);for(let i=0;i<4;i++)line([[30,30],[40+i*20,90-i*16]],secondary+'90');jewel(31,31,9,secondary);});for(const a of [23,1001])for(let b=240;b<1330;b+=100)poly([[a,b-14],[a+(a<512?10:-10),b],[a,b+14]],primary+'65',primary+'90');
  }else if(id==='katana'){
    rounded(35,5,1.4);corner(()=>{poly([[28,54],[28,28],[54,28],[70,44],[54,70],[44,70]],'#302830',primary,2);ring(45,45,14,secondary);line([[45,23],[45,67]],primary);line([[23,45],[67,45]],primary);});for(const a of [22,1002])for(let b=160;b<1410;b+=28)poly([[a-5,b],[a,b-10],[a+5,b],[a,b+10]],secondary+'7a',primary+'70',1);line([[145,24],[879,24]],secondary+'90',2);line([[145,1512],[879,1512]],secondary+'90',2);
  }else if(id==='darkthorns'){
    rounded(35,7,1.1,primary+'80');corner(()=>{poly([[24,130],[24,24],[130,24],[86,40],[92,61],[62,52],[52,83],[40,76]],'#2d2338',primary);jewel(38,38,16,secondary+'80');});for(const a of [23,1001])for(let b=200;b<1350;b+=85){const d=a<512?1:-1;line([[a,b-30],[a+d*8,b],[a,b+35]],primary+'b0',2);poly([[a+d*6,b],[a+d*22,b-13],[a+d*8,b+13]],secondary+'55',primary+'80');}
  }else if(id==='viperedge'){
    rounded(27,10,1.4,primary);rounded(38,10,1.2,secondary+'90');corner(()=>{poly([[23,135],[32,93],[50,50],[93,32],[135,23],[100,45],[61,61],[45,100]],primary+'50',secondary);line([[28,28],[78,78]],secondary,2);});for(const a of [23,1001])for(let b=200;b<1360;b+=90){line([[a,b-18],[a+6,b],[a,b+18],[a-6,b],[a,b-18]],primary+'b0');}
  }else if(id==='paintstroke'){
    const paints=['#d4a5c8','#a6cbdc','#dfc88e','#b0cba2','#b9a9d8'];for(const side of [-1,1])for(let i=0;i<16;i++){const a=side<0?24:1000,b=100+i*90;line([[a,b],[a+side*4,b+24],[a,b+48]],paints[i%5]+'bb',3+i%3);}for(const b of [24,1512])for(let i=0;i<15;i++)line([[100+i*57,b],[123+i*57,b+Math.sin(i)*3]],paints[i%5]+'bb',3);corner(()=>{for(let i=0;i<6;i++)dot(26+i*8,26+(i%2)*9,3+i%3,paints[i%5]);poly([[44,38],[48,48],[60,52],[48,56],[44,67],[40,56],[29,52],[40,48]],secondary+'d0',null);});
  }
  return c;
}

export function createCardFrames({onChange}){
  let resolution=1024,selected='classic';try{const saved=localStorage.getItem('card.frame');if(framePresets.some(p=>p[0]===saved))selected=saved;}catch{}
  const texture=new THREE.CanvasTexture(drawFrame(selected));texture.colorSpace=THREE.SRGBColorSpace;
  const panel=document.createElement('section');panel.className='card-frames';panel.setAttribute('aria-label','卡片边框');panel.innerHTML='<div class="section-label">卡片边框 <span>新增 20 款</span></div><label class="frame-filter-label" for="frame-filter">边框分类</label><select id="frame-filter"></select><div class="frame-grid"></div><p id="frame-description"></p>';
  const css=document.createElement('style');css.textContent='.card-frames{padding-bottom:18px;border-bottom:1px solid var(--line)}.card-frames .section-label span{font-size:10px;color:#968696}.frame-filter-label{font-size:11px;color:#bca8b8;display:block;margin-bottom:5px}#frame-filter{width:100%;background:#211c29;color:#edd8ce;border:1px solid #ffffff24;border-radius:5px;padding:7px;font:inherit;font-size:11px;margin-bottom:10px}.frame-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;max-height:350px;overflow-y:auto;scrollbar-width:thin;padding:2px}.frame-grid button{padding:0;overflow:hidden;border:1px solid #ffffff20;border-radius:6px;background:linear-gradient(145deg,#303040,#171a2b);color:#c9b9c5;font:inherit;font-size:10px}.frame-grid button[hidden]{display:none}.frame-grid img{display:block;width:100%;height:106px;object-fit:contain}.frame-grid span{display:block;padding:5px 0;background:#1c1827}.frame-grid button[aria-pressed="true"]{border-color:#edc4a4;box-shadow:0 0 0 1px #edc4a455;color:#ffe0c9}.frame-grid button:hover{border-color:#d3a79d99}#frame-description{font-size:11px;color:#bca8b8;line-height:1.7;margin:10px 0 0}';document.head.append(css);
  const buttons=[],filter=panel.querySelector('select');for(const [value,name]of [['all','全部边框 · 21 款'],['new','本次新增 · 20 款'],...Array.from(new Set(framePresets.map(p=>p[2]))).map(group=>[group,group+' · '+framePresets.filter(p=>p[2]===group).length+' 款'])]){const option=document.createElement('option');option.value=value;option.textContent=name;filter.append(option);}
  function choose(id){selected=id;const preset=framePresets.find(p=>p[0]===id);texture.image=drawFrame(id,resolution);texture.needsUpdate=true;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.frame===id)));panel.querySelector('#frame-description').textContent=preset[1]+' · '+preset[3];try{localStorage.setItem('card.frame',id);}catch{}onChange?.({id,name:preset[1],color:preset[4]});}
  for(const [id,name,category]of framePresets){const button=document.createElement('button');button.dataset.frame=id;button.dataset.category=category;button.setAttribute('aria-label',name);const image=document.createElement('img');image.alt='';image.src=drawFrame(id,144).toDataURL('image/png');const label=document.createElement('span');label.textContent=name;button.append(image,label);button.onclick=()=>choose(id);buttons.push(button);panel.querySelector('.frame-grid').append(button);}
  filter.onchange=()=>buttons.forEach(b=>b.hidden=filter.value!=='all'&&!(filter.value==='new'&&b.dataset.frame!=='classic')&&b.dataset.category!==filter.value);
  document.querySelector('.card-backgrounds').after(panel);choose(selected);return {texture,getResolution:()=>resolution,setResolution(width){if(width===resolution)return;resolution=width;texture.dispose();texture.image=drawFrame(selected,width);texture.needsUpdate=true;},getState:()=>({id:selected,name:framePresets.find(p=>p[0]===selected)[1]})};
}
