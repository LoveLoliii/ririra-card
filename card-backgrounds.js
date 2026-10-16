import * as THREE from './vendor/three/three.module.js';
import { ff14Themes, paintFF14 } from './ff14-backgrounds.js';
import { expandedThemes, paintExpanded } from './ff14-backgrounds-expansion.js';

const themes=[
  ['rose','玫瑰环纹','原有玫瑰环纹与前景花瓣。'],
  ['astral','星海秘仪','深蓝星云、星座与金色星轨。'],
  ['moon','月下山岚','银月、远山与静水倒影。'],
  ['sakura','樱庭夜雨','紫色夜庭、樱枝与飘落花瓣。'],
  ['forest','翡翠森境','层叠森林、萤火与柔和天光。'],
  ['frost','冰晶圣域','冰蓝晶簇、极光与雪尘。'],
  ['sunset','暮金云海','落日、金色云层与远方山脊。'],
  ['ink','水墨远山','深色宣纸、淡墨群山与朱红圆月。'],
  ['neon','霓虹回路','紫蓝光环、几何回路与透视网格。'],
  ...ff14Themes,
  ...expandedThemes
];

// Stable seeded details: switching and exporting never changes the composition.
function paint(id,width=1024){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=width*1.5;
  const x=canvas.getContext('2d');x.scale(width/1024,width/1024);let seed=1937;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const palettes={astral:['#132b51','#080e22'],moon:['#203c50','#0b1526'],sakura:['#462638','#171323'],forest:['#163d36','#071c1c'],frost:['#24435b','#101e36'],sunset:['#764745','#241c30'],ink:['#3b4144','#181d24'],neon:['#27164d','#0b1129']};
  const [light,dark]=palettes[id]||palettes.astral;
  let g=x.createRadialGradient(512,620,30,512,768,1000);g.addColorStop(0,light);g.addColorStop(1,dark);x.fillStyle=g;x.fillRect(0,0,1024,1536);
  const line=(points,color,width=1)=>{x.strokeStyle=color;x.lineWidth=width;x.beginPath();points.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.stroke();};
  const disc=(a,b,r,color)=>{x.fillStyle=color;x.beginPath();x.arc(a,b,r,0,Math.PI*2);x.fill();};
  const glow=(a,b,r,color)=>{const g=x.createRadialGradient(a,b,0,a,b,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');x.fillStyle=g;x.fillRect(a-r,b-r,r*2,r*2);};
  const mountain=(base,height,color)=>{x.fillStyle=color;x.beginPath();x.moveTo(0,base);for(let a=0;a<=1100;a+=65)x.lineTo(a,base-rand()*height);x.lineTo(1024,1350);x.lineTo(0,1350);x.fill();};
  const dust=(count,color)=>{for(let i=0;i<count;i++){const a=60+rand()*904,b=260+rand()*950;disc(a,b,.5+rand()*1.6,color);}};
  x.save();x.beginPath();x.roundRect(62,270,900,1030,150);x.clip();
  if(id==='astral'){
    for(let i=0;i<14;i++)glow(100+rand()*824,350+rand()*750,100+rand()*200,i%2?'#77469124':'#4ba6c526');
    dust(240,'#dce9ffb0');x.save();x.translate(512,760);x.rotate(-.5);for(const r of [300,340,385]){x.strokeStyle='#c5ad7760';x.lineWidth=1.2;x.beginPath();x.ellipse(0,0,r,r*.7,0,0,Math.PI*2);x.stroke();}x.restore();
    const stars=[[180,490],[270,420],[330,555],[225,690],[130,610]];line(stars,'#c9d5f65c',1.5);stars.forEach(([a,b])=>{glow(a,b,15,'#b8d6ff70');disc(a,b,3,'#e6efff');});
  }else if(id==='moon'){
    glow(740,420,200,'#b4d7e43b');disc(740,420,90,'#c4d5d7');disc(770,396,82,light);
    mountain(900,220,'#56768550');mountain(1000,180,'#243e50');mountain(1100,160,'#132c3c');
    for(let i=0;i<55;i++){const b=1030+i*4,a=660-rand()*100;line([[a,b],[a+rand()*180,b]],'#a2ccdb25',1+rand()*2);}dust(70,'#ccedff75');
  }else if(id==='sakura'){
    glow(760,440,190,'#e7a3bf25');disc(760,440,64,'#d8b5bd77');
    for(let side=0;side<2;side++){const a=side?1024:0,d=side?-1:1;line([[a,430],[a+d*140,480],[a+d*250,390],[a+d*345,365]],'#a5788990',7);line([[a+d*140,480],[a+d*180,590],[a+d*280,630]],'#a5788970',4);for(let i=0;i<68;i++){const b=365+rand()*275,c=a+d*(50+rand()*275);x.save();x.translate(c,b);x.rotate(rand()*6);x.fillStyle=i%3?'#e5adc080':'#ffe0d5a0';x.beginPath();x.ellipse(0,0,4+rand()*6,2+rand()*3,0,0,7);x.fill();x.restore();}}
    for(let i=0;i<36;i++){const a=80+rand()*864,b=550+rand()*650;x.save();x.translate(a,b);x.rotate(rand()*6);x.fillStyle='#e5a9bc80';x.beginPath();x.ellipse(0,0,3+rand()*6,2+rand()*3,0,0,7);x.fill();x.restore();}
    for(let i=0;i<70;i++){const a=rand()*1024,b=rand()*1300;line([[a,b],[a-8,b+30]],'#dac5e218');}
  }else if(id==='forest'){
    for(let i=0;i<8;i++){x.fillStyle='#b7e5bb08';x.beginPath();x.moveTo(360+i*60,200);x.lineTo(80+i*110,1300);x.lineTo(220+i*110,1300);x.fill();}
    for(let layer=0;layer<3;layer++){for(let i=0;i<13;i++){const a=rand()*1024,b=700+layer*155,h=180+rand()*280;x.fillStyle=['#59807540','#2c5b4f90','#102e2a'][layer];x.beginPath();x.moveTo(a,b-h);x.lineTo(a-45-layer*14,b);x.lineTo(a+45+layer*14,b);x.fill();x.fillRect(a-3,b-15,6,80);}}
    for(let i=0;i<50;i++){const a=80+rand()*864,b=600+rand()*580;glow(a,b,12,'#d7ed7b35');disc(a,b,1.4,'#e6f4a9b0');}
  }else if(id==='frost'){
    for(let i=0;i<5;i++){x.strokeStyle=['#7ae5cd15','#96bbff18'][i%2];x.lineWidth=40;x.beginPath();x.moveTo(40,420+i*45);x.bezierCurveTo(300,180+i*55,560,650-i*20,1024,380+i*35);x.stroke();}
    for(let i=0;i<18;i++){const a=rand()*1024,b=1120+rand()*170,h=90+rand()*340,w=15+rand()*45;const g=x.createLinearGradient(a, b-h,a+w,b);g.addColorStop(0,'#a4e6ed85');g.addColorStop(1,'#39668710');x.fillStyle=g;x.beginPath();x.moveTo(a,b-h);x.lineTo(a+w,b-h*.7);x.lineTo(a+w*.6,b);x.lineTo(a-w,b);x.lineTo(a-w*.8,b-h*.65);x.closePath();x.fill();line([[a,b-h],[a,b]],'#c4e6f344');}dust(160,'#daf4ff8a');
  }else if(id==='sunset'){
    glow(690,610,310,'#edbe7950');disc(690,610,118,'#f1bd9070');
    for(let i=0;i<35;i++){const a=rand()*1024,b=450+rand()*420;x.fillStyle=i%2?'#ebbe9e12':'#c091a515';x.beginPath();x.ellipse(a,b,100+rand()*160,8+rand()*20,0,0,7);x.fill();}
    mountain(1000,230,'#6b536380');mountain(1150,210,'#40364e');mountain(1290,170,'#282637');dust(55,'#efcba559');
  }else if(id==='ink'){
    disc(750,470,92,'#a85b5080');for(let i=0;i<5;i++)mountain(800+i*100,120+rand()*180,['#a2aaa91c','#8a96992b','#70808338','#53646855','#26383e80'][i]);
    for(let i=0;i<1600;i++){const a=rand()*1024,b=rand()*1536;x.fillStyle=i%2?'#ffffff06':'#0000000c';x.fillRect(a,b,1,1+rand()*8);}line([[145,460],[175,420],[200,442],[225,410]],'#d4d9d16b',2);
  }else if(id==='neon'){
    for(let i=0;i<9;i++){const r=185+i*28;x.strokeStyle=i%2?'#b26af330':'#58ccdb32';x.lineWidth=i===8?4:1;x.beginPath();for(let j=0;j<=6;j++){const a=j*Math.PI/3;x.lineTo(512+Math.cos(a)*r,735+Math.sin(a)*r);}x.stroke();}
    for(let i=0;i<9;i++){const a=70+i*110;line([[a,1250],[512+(a-512)*.15,950]],'#68c5e72a');line([[65,970+i*i*4],[960,970+i*i*4]],'#b270db23');}
    for(let side=0;side<2;side++)for(let i=0;i<6;i++){const a=side?940:84,d=side?-1:1,b=400+i*110;line([[a,b],[a+d*40,b],[a+d*70,b+30],[a+d*110,b+30]],'#75cde070',2);disc(a+d*110,b+30,3,'#d8a8ef');}
  }
  x.restore();
  // Quiet areas behind the fixed heading and caption keep gold type readable.
  g=x.createLinearGradient(0,0,0,1536);g.addColorStop(0,dark);g.addColorStop(.16,dark+'dd');g.addColorStop(.30,dark+'00');g.addColorStop(.76,dark+'00');g.addColorStop(.87,dark+'e8');g.addColorStop(1,dark);x.fillStyle=g;x.fillRect(0,0,1024,1536);
  x.strokeStyle='#ccb49c45';x.lineWidth=1.5;x.beginPath();x.roundRect(65,275,894,1025,150);x.stroke();
  line([[100,265],[924,265]],'#d9bc9850');line([[150,1320],[874,1320]],'#d9bc9830');
  return canvas;
}

export function createCardBackgrounds({original,mesh,effects,onChange}){
  const textures=new Map([['rose',original]]);
  const panel=document.createElement('section');panel.className='card-backgrounds';panel.setAttribute('aria-label','卡面背景');
  panel.innerHTML=`<div class="section-label">卡面背景 <span>${themes.length} 款 · 新增 50</span></div><label class="background-filter-label" for="background-filter">主题分类</label><select id="background-filter"></select><label class="background-filter-label" for="background-search">搜索背景</label><input id="background-search" type="search" placeholder="搜索名称或图案，如：水晶、海、月"><div class="background-grid"></div><p id="background-empty" hidden>没有匹配的背景，请换个关键词。</p><p id="background-description"></p>`;
  const expandedIds=new Set(expandedThemes.map(t=>t[0]));
  const filter=panel.querySelector('#background-filter'),search=panel.querySelector('#background-search');
  for(const [value,name]of [['all',`全部背景 · ${themes.length} 款`],['new','本次新增 · 50 款'],['base','基础主题 · 9 款'],...Array.from(new Set(themes.map(t=>t[3]).filter(Boolean))).map(category=>[category,`FF14 ${category} · ${themes.filter(t=>t[3]===category).length} 款`])]){const option=document.createElement('option');option.value=value;option.textContent=name;filter.append(option);}
  const css=document.createElement('style');css.textContent='.card-backgrounds{padding-bottom:18px;border-bottom:1px solid var(--line)}.background-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.background-grid button{padding:0;overflow:hidden;border:1px solid #ffffff20;border-radius:7px;background:#ffffff04;color:#c9b9c5;font:inherit;font-size:10px}.background-grid img{display:block;width:100%;height:66px;object-fit:cover;object-position:center 40%}.background-grid span{display:block;padding:5px 0}.background-grid button[aria-pressed="true"]{border-color:#edc4a4;box-shadow:0 0 0 1px #edc4a455;color:#ffe0c9}.background-grid button:hover{border-color:#d3a79d99}#background-description{font-size:11px;color:#bca8b8;margin:10px 0 0;line-height:1.7}.card-backgrounds .section-label span{color:#968696;font-size:10px}';document.head.append(css);
  const buttons=[];let resolution=1024,exportTexture,selected='rose';try{const saved=localStorage.getItem('card.background');if(themes.some(t=>t[0]===saved))selected=saved;}catch{}
  css.textContent+='.background-filter-label{display:block;color:#bca8b8;font-size:10px;margin-bottom:5px}#background-filter{width:100%;background:#211c29;color:#edd8ce;border:1px solid #ffffff24;border-radius:5px;padding:7px;font:inherit;font-size:11px;margin-bottom:10px}.background-grid{max-height:340px;overflow-y:auto;padding:2px;scrollbar-width:thin}.background-grid button[hidden]{display:none}.background-grid img{height:80px}';
  css.textContent+='#background-search{box-sizing:border-box;width:100%;background:#211c29;color:#edd8ce;border:1px solid #ffffff24;border-radius:5px;padding:8px;font:inherit;font-size:11px;margin-bottom:10px}#background-empty{font-size:11px;color:#bca8b8}#background-empty[hidden]{display:none}';
  const makeCanvas=(id,width=1024)=>expandedIds.has(id)?paintExpanded(id,width):ff14Themes.some(t=>t[0]===id)?paintFF14(id,width):paint(id,width);
  function choose(id){selected=id;if(!textures.has(id)){const texture=new THREE.CanvasTexture(makeCanvas(id));texture.colorSpace=THREE.SRGBColorSpace;textures.set(id,texture);}mesh.material.map=textures.get(id);mesh.material.needsUpdate=true;effects.visible=id==='rose';for(const [key,texture]of textures){if(textures.size<=4)break;if(key!==id&&key!=='rose'){texture.dispose();textures.delete(key);}}buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.background===id)));const theme=themes.find(t=>t[0]===id);panel.querySelector('#background-description').textContent=theme[1]+' · '+theme[2];try{localStorage.setItem('card.background',id);}catch{}onChange?.({id,name:theme[1]});}
  for(const [id,name,description,category='base'] of themes){let source;if(id==='rose'){source=original.image.src;}else{const canvas=makeCanvas(id,144),thumb=document.createElement('canvas');thumb.width=144;thumb.height=216;thumb.getContext('2d').drawImage(canvas,0,0,144,216);source=thumb.toDataURL('image/png');}const b=document.createElement('button');b.dataset.background=id;b.dataset.category=category;b.dataset.search=(name+' '+description).toLowerCase();b.setAttribute('aria-label',name);const img=document.createElement('img');img.alt='';img.src=source;b.append(img);const label=document.createElement('span');label.textContent=name;b.append(label);b.onclick=()=>choose(id);panel.querySelector('.background-grid').append(b);buttons.push(b);}
  function filterThemes(){const value=filter.value,query=search.value.trim().toLowerCase();buttons.forEach(b=>b.hidden=!(value==='all'||value==='new'&&expandedIds.has(b.dataset.background)||b.dataset.category===value)||!b.dataset.search.includes(query));panel.querySelector('.background-grid').scrollTop=0;panel.querySelector('#background-empty').hidden=buttons.some(b=>!b.hidden);}
  filter.onchange=filterThemes;search.oninput=filterThemes;
  const anchor=document.querySelector('.render-styles');anchor.after(panel);choose(selected);
  return {getResolution:()=>resolution,setResolution(width){if(width===resolution)return;resolution=width;exportTexture?.dispose();exportTexture=null;if(width===1024||selected==='rose')mesh.material.map=textures.get(selected);else{exportTexture=new THREE.CanvasTexture(makeCanvas(selected,width));exportTexture.colorSpace=THREE.SRGBColorSpace;mesh.material.map=exportTexture;}},getState:()=>({id:selected,name:themes.find(t=>t[0]===selected)[1]})};
}
