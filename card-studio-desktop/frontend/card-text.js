import * as THREE from './vendor/three/three.module.js';

const defaults={title:'玫瑰雨幕',subtitle:'ROSE IN THE RAIN',message:'喜欢你呀',rarity:'SR',collection:'FFXIV  /  PRIVATE COLLECTION',archive:'ROSE GOLD  ·  CHARACTER ARCHIVE',number:'No.001',finish:'HOLO / SR',monogram:'R'};
const fields=[['title','卡名',40],['subtitle','副标题',100],['message','角色寄语',100],['rarity','稀有度',16],['collection','顶部典藏文字',100],['archive','底部说明',100],['number','卡片编号',32],['finish','右下角标记',40],['monogram','卡背中央文字',12]];

export function createCardText({onChange}){
  let frameAccent='#ae8273';const values={...defaults};try{const saved=JSON.parse(localStorage.getItem('card.text'));for(const [key,,limit]of fields)if(typeof saved?.[key]==='string')values[key]=saved[key].slice(0,limit);}catch{}
  const make=()=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return {canvas,texture};};
  const front=make(),back=make();let resolution=1024;
  const panel=document.createElement('section');panel.className='card-text';panel.setAttribute('aria-label','卡面文字');
  panel.innerHTML='<div class="section-label">卡面文字 <span>实时保存</span></div><div class="text-main"></div><details><summary>更多文字与卡背</summary><div class="text-more"></div></details><p class="text-help">留空可隐藏文字；长文字自动缩小。寄语最多显示两行。</p><button class="text-reset secondary" type="button">恢复默认文字</button>';
  const css=document.createElement('style');css.textContent='.card-text{padding-bottom:18px;border-bottom:1px solid var(--line)}.card-text .section-label span{color:#968696;font-size:10px}.card-text label{display:block;font-size:11px;color:#bfaebc;margin:9px 0 4px}.card-text input,.card-text textarea{display:block;width:100%;box-sizing:border-box;border:1px solid #ffffff24;border-radius:5px;background:#211c29;color:#edd8ce;padding:8px;font:inherit;font-size:12px}.card-text textarea{resize:vertical;min-height:58px}.card-text summary{cursor:pointer;font-size:11px;color:#ddc4ba;margin-top:13px}.text-help{font-size:10px;color:#968696;line-height:1.7;margin:9px 0}.text-reset{width:100%;font-size:11px;padding:7px}';document.head.append(css);
  const controls=new Map();
  for(const [i,[key,label,limit]]of fields.entries()){const wrap=document.createElement('div'),caption=document.createElement('label');caption.htmlFor='card-text-'+key;caption.textContent=label;const input=document.createElement(key==='message'?'textarea':'input');input.id='card-text-'+key;if(key!=='message')input.type='text';input.maxLength=limit;input.value=values[key];input.autocomplete='off';input.spellcheck=false;input.oninput=()=>{values[key]=input.value;update();};wrap.append(caption,input);panel.querySelector(i<4?'.text-main':'.text-more').append(wrap);controls.set(key,input);}
  function label(ctx,text,a,b,size,maxWidth,{align='center',serif=false,color='#efd2b7'}={}){
    if(!text)return;ctx.save();ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';const family=serif?'"SimSun","Songti SC",serif':'"Microsoft YaHei","Segoe UI",sans-serif';let fontSize=size;ctx.font=`${fontSize}px ${family}`;while(ctx.measureText(text).width>maxWidth&&fontSize>10){fontSize--;ctx.font=`${fontSize}px ${family}`;}ctx.fillText(text,a,b,maxWidth);ctx.restore();
  }
  function paintFront(){const ctx=front.canvas.getContext('2d');ctx.setTransform(resolution/1024,0,0,resolution/1024,0,0);ctx.clearRect(0,0,1024,1536);
    label(ctx,values.collection,512,62,19,700);label(ctx,values.title,512,123,57,820,{serif:true});label(ctx,values.subtitle,512,180,18,820);label(ctx,values.rarity,910,75,25,115,{serif:true});
    ctx.strokeStyle=frameAccent+'dc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(92,217);ctx.lineTo(932,217);ctx.stroke();
    const lines=values.message.replace(/\r/g,'').split('\n').slice(0,2);for(const [i,line]of lines.entries())label(ctx,line,512,lines.length===1?1345:1323+i*45,lines.length===1?47:36,820,{serif:true});
    label(ctx,values.archive,512,1405,18,820);label(ctx,values.number,103,1474,19,390,{align:'left'});label(ctx,values.finish,921,1474,17,390,{align:'right'});
    front.texture.needsUpdate=true;
  }
  function paintBack(){const ctx=back.canvas.getContext('2d');ctx.setTransform(resolution/1024,0,0,resolution/1024,0,0);const g=ctx.createRadialGradient(512,680,20,512,768,850);g.addColorStop(0,'#382b41');g.addColorStop(1,'#13121f');ctx.fillStyle=g;ctx.fillRect(0,0,1024,1536);ctx.lineWidth=1;for(const r of [235,250,290]){ctx.beginPath();ctx.arc(512,740,r,0,Math.PI*2);ctx.strokeStyle=frameAccent+'65';ctx.stroke();}
    label(ctx,values.collection,512,215,24,840);label(ctx,values.monogram,512,760,80,500,{serif:true});label(ctx,values.title,512,855,32,780,{serif:true});label(ctx,values.subtitle,512,920,24,800);
    const message=values.message.replace(/\r?\n/g,' ');label(ctx,message,512,1270,25,820,{serif:true});label(ctx,values.archive,512,1340,18,820);label(ctx,[values.number,values.rarity].filter(Boolean).join(' · '),512,1400,18,820);back.texture.needsUpdate=true;
  }
  function update(){paintFront();paintBack();try{localStorage.setItem('card.text',JSON.stringify(values));}catch{}
    document.querySelector('h1').textContent=values.title;document.title=(values.title?values.title+' · ':'')+'3D 闪卡工作台';const note=document.querySelector('.view-note');note.replaceChildren(document.createTextNode(values.number));const strong=document.createElement('strong');strong.textContent=[values.title,values.subtitle].filter(Boolean).join(' · ');note.append(strong);document.querySelector('.eyebrow').textContent=[values.collection,values.rarity].filter(Boolean).join(' / ');onChange?.({...values});
  }
  panel.querySelector('.text-reset').onclick=()=>{Object.assign(values,defaults);for(const [key,input]of controls)input.value=values[key];update();};
  document.querySelector('.card-backgrounds').after(panel);update();
  return {getResolution:()=>resolution,setResolution(width){if(width===resolution)return;resolution=width;for(const layer of [front,back]){layer.canvas.width=width;layer.canvas.height=width*1.5;layer.texture.dispose();}paintFront();paintBack();},front:front.texture,back:back.texture,setFrameAccent:value=>{frameAccent=value;paintFront();paintBack();},getState:()=>({...values})};
}
