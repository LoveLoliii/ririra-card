// Original looping interpretations of FFXIV crystal, job and primal motifs.
export const ff14EffectChoices=[
  ['crystal-rain','以太水晶雨','水晶与科技','蓝白棱晶沿卡面缓缓落下。'],
  ['crystal-pulse','母水晶脉冲','水晶与科技','同心以太波向外扩散，伴随小型晶片。'],
  ['starfall','星海流星','水晶与科技','流星拖尾划过边缘，留下柔和星尘。'],
  ['tower-orbits','水晶塔星轨','水晶与科技','金蓝轨道绕行，晶核在轨道上流转。'],
  ['nine-data','九号数据流','水晶与科技','紫青数据块与光柱沿两侧流动。'],
  ['lily-bloom','白魔百合','治疗与魔法','白色百合与嫩叶交替绽放。'],
  ['fairy-wings','学者妖精','治疗与魔法','青绿双翼光灵与小型疗愈光点。'],
  ['astro-cards','占星秘卡','治疗与魔法','六枚小型秘卡沿星盘轨迹运行。'],
  ['sage-wings','贤者浮晶','治疗与魔法','四枚蓝绿浮晶与细长以太轨迹。'],
  ['black-elements','黑魔火冰','治疗与魔法','两侧交替浮现赤焰与冰晶。'],
  ['red-duality','赤魔双辉','战技与绘灵','绯红与银白光丝相互缠绕。'],
  ['dragon-trail','龙骑苍龙','战技与绘灵','苍蓝龙形弧光与翼状光痕。'],
  ['samurai-cut','武士居合','战技与绘灵','金白刀弧扫过，伴随绯樱光瓣。'],
  ['viper-coils','蝰蛇双刃','战技与绘灵','翠绿与琥珀双轨沿边缘盘旋。'],
  ['picto-paint','绘灵彩迹','战技与绘灵','彩色笔触、颜料圆点与飞溅星形。'],
  ['ifrit-embers','炎神余烬','蛮神元素','橘红火星上升，边缘燃起轻焰。'],
  ['shiva-flakes','冰神六花','蛮神元素','六角霜花旋转漂浮，寒光轻闪。'],
  ['ramuh-arcs','雷神电弧','蛮神元素','紫色分叉电纹在卡面两侧游走。'],
  ['leviathan-tide','水神潮纹','蛮神元素','碧蓝波纹与水珠沿卡缘卷动。'],
  ['garuda-feathers','风神羽旋','蛮神元素','浅绿羽片环绕，细风线持续旋卷。']
];

export function drawFF14Effects(ctx,{layers,phase,intensity,count,particles,visibility,originalColors,color}){
  const TAU=Math.PI*2,t=phase*TAU,n=Math.min(36,Math.ceil(count*.6));
  const rgba=(hex,alpha=1)=>{const v=parseInt(hex.slice(1),16);return `rgba(${v>>16},${v>>8&255},${v&255},${alpha})`;};
  const col=(hex,i=0,alpha=1)=>originalColors?rgba(hex,alpha):color(i,alpha);
  const line=(points,paint,width=1)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=paint;ctx.lineWidth=width;ctx.stroke();};
  const poly=(points,paint,stroke)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(paint){ctx.fillStyle=paint;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.2;ctx.stroke();}};
  const dot=(a,b,r,paint)=>{ctx.fillStyle=paint;ctx.beginPath();ctx.arc(a,b,r,0,TAU);ctx.fill();};
  const ring=(a,b,r,paint,width=1)=>{ctx.strokeStyle=paint;ctx.lineWidth=width;ctx.beginPath();ctx.arc(a,b,r,0,TAU);ctx.stroke();};
  const leaf=(a,b,s,angle,paint)=>{ctx.save();ctx.translate(a,b);ctx.rotate(angle);ctx.fillStyle=paint;ctx.beginPath();ctx.moveTo(0,s*.5);ctx.bezierCurveTo(-s*.7,-s*.1,-s*.4,-s,0,-s);ctx.bezierCurveTo(s*.6,-s*.7,s*.6,0,0,s*.5);ctx.fill();ctx.restore();};
  const shard=(a,b,s,angle,hex,i)=>{ctx.save();ctx.translate(a,b);ctx.rotate(angle);poly([[0,-s*1.7],[s*.5,-s*.4],[s*.35,s],[0,s*1.5],[-s*.55,s*.3],[-s*.4,-s]],col(hex,i,.7),col(hex,i,.9));line([[0,-s*1.7],[0,s*1.5]],col('#eafaff',i,.7));ctx.restore();};
  const pulse=v=>Math.sin(Math.PI*v)**2;
  const trail=(points,hex,index,alpha,width)=>{ctx.save();ctx.globalAlpha=alpha;line(points,col(hex,index),width);ctx.globalAlpha=alpha*.2;line(points,col(hex,index),width*4);ctx.restore();};
  const star=(a,b,s,hex,i)=>{poly([[a,b-s],[a+s*.2,b-s*.2],[a+s,b],[a+s*.2,b+s*.2],[a,b+s],[a-s*.2,b+s*.2],[a-s,b],[a-s*.2,b-s*.2]],col(hex,i,.9));};
  for(const id of layers){
    ctx.save();ctx.globalAlpha=1;
    if(id==='crystal-rain')for(let i=0;i<n;i++){const p=particles[i],v=(phase+p.phase)%1,a=p.x+Math.sin(t+p.turn)*14,b=230+v*1065;ctx.globalAlpha=visibility(a,b)*.8;shard(a,b,p.size*.9,p.turn+Math.sin(t)*.25,'#a9e4ff',i);}
    else if(id==='crystal-pulse'){
      for(let i=0;i<3;i++){const v=(phase+i/3)%1;ctx.globalAlpha=intensity*pulse(v)*.42;ring(512,770,170+v*240,col('#b9edff',i),2.2);ring(512,770,182+v*240,col('#8bd1f6',i,.55),1);}
      for(let i=0;i<Math.ceil(n*.4);i++){const p=particles[i],a=p.turn+t,b=285+Math.sin(t+p.turn)*30,x=512+Math.cos(a)*b,y=770+Math.sin(a)*b;ctx.globalAlpha=visibility(x,y)*.7;shard(x,y,7+p.size*.4,a,'#c2edff',i);}
    }else if(id==='starfall')for(let i=0;i<Math.ceil(n*.45);i++){const p=particles[i],v=(phase+p.phase)%1,a=140+p.x*.7+(v-.5)*300,b=270+v*950;ctx.globalAlpha=1;const points=Array.from({length:7},(_,j)=>[a-j*10,b-j*23]);trail(points,'#c6ddff',i,visibility(a,b)*pulse(v)*.65,2.3);ctx.globalAlpha=visibility(a,b)*pulse(v);star(a,b,5+p.size*.3,'#edf5ff',i);}
    else if(id==='tower-orbits'){
      ctx.save();ctx.translate(512,770);for(let k=0;k<3;k++){ctx.save();ctx.rotate(k*Math.PI/3+.2);ctx.strokeStyle=col(k%2?'#b5daf7':'#ecd69d',k,.45);ctx.lineWidth=1.4;ctx.globalAlpha=intensity;ctx.beginPath();ctx.ellipse(0,0,335,130+k*45,0,0,TAU);ctx.stroke();const a=t+k*TAU/3;ctx.globalAlpha=intensity*.8;shard(Math.cos(a)*335,Math.sin(a)*(130+k*45),10,a,'#adddff',k);ctx.restore();}ctx.restore();
    }else if(id==='nine-data')for(let i=0;i<n;i++){const p=particles[i],a=i%2?850+(p.x%70):105+(p.x%70),v=(phase+p.phase)%1,b=230+v*1065;ctx.globalAlpha=visibility(a,b)*.7;ctx.fillStyle=col(i%3?'#b99bff':'#88e3ef',i);ctx.fillRect(a,b,4+(i%3)*3,7+(i%4)*5);ctx.globalAlpha=visibility(a,b)*.15;ctx.fillRect(a-1,b-50,2,110);if(i%4===0)line([[a,b],[a+22,b],[a+22,b+18]],col('#a9d9ff',i,.7),1.5);}
    else if(id==='lily-bloom')for(let i=0;i<Math.ceil(n*.4);i++){const p=particles[i],a=p.x,b=p.y+Math.sin(t+p.turn)*14,v=(phase+p.phase)%1,s=(10+p.size)*(.6+pulse(v)*.5);ctx.globalAlpha=visibility(a,b)*(.3+pulse(v)*.6);for(let k=0;k<6;k++)leaf(a,b,s,k*TAU/6+t/6,col('#f5f2df',i,.8));dot(a,b,s*.16,col('#e4d29b',i));leaf(a+6,b+12,s*.65,.8,col('#a9d5ad',i,.65));}
    else if(id==='fairy-wings')for(let i=0;i<Math.ceil(n*.25);i++){const p=particles[i],a=p.x+Math.sin(t+p.turn)*28,b=p.y+Math.cos(t+p.turn)*20,flap=.45+.25*Math.sin(t*2+p.turn),s=15+p.size;ctx.globalAlpha=visibility(a,b)*.8;leaf(a-2,b,s,-flap-.5,col('#a7efd1',i,.65));leaf(a+2,b,s,flap+.5,col('#c6f4dc',i,.65));leaf(a-1,b+3,s*.65,-1.4-flap,col('#a9e9d2',i,.4));leaf(a+1,b+3,s*.65,1.4+flap,col('#a9e9d2',i,.4));dot(a,b,2.2,col('#edfff0',i));}
    else if(id==='astro-cards'){
      ctx.globalAlpha=intensity*.3;ring(512,770,325,col('#ddc494'));ring(512,770,340,col('#c6b3db'));for(let i=0;i<6;i++){const a=t+i*TAU/6,x=512+Math.cos(a)*325,y=770+Math.sin(a)*325;ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.globalAlpha=visibility(x,y)*.85;ctx.fillStyle=col('#29304d',i,.9);ctx.fillRect(-17,-27,34,54);ctx.strokeStyle=col('#ead39e',i);ctx.lineWidth=1.5;ctx.strokeRect(-17,-27,34,54);poly([[0,-15],[9,0],[0,15],[-9,0]],null,col('#d5bce6',i));star(0,0,6,'#f4dfaf',i);ctx.restore();}
    }else if(id==='sage-wings')for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4+Math.sin(t)*.12,x=512+Math.cos(a)*320,y=770+Math.sin(a)*315;ctx.save();ctx.translate(x,y);ctx.rotate(a+Math.PI/2);ctx.globalAlpha=visibility(x,y)*.8;poly([[-7,-58],[0,-85],[7,-58],[13,32],[0,57],[-13,32]],col('#b0e2e2',i,.6),col('#dcfaff',i,.85));line([[0,-42],[0,28]],col('#8cf5e6',i),3);ctx.restore();trail([[x,y],[x-Math.cos(a)*25,y-Math.sin(a)*25],[x-Math.cos(a)*70,y-Math.sin(a)*70]],'#a4e8db',i,intensity*.25,2);}
    else if(id==='black-elements')for(let i=0;i<Math.ceil(n*.7);i++){const p=particles[i],left=i%2===0,a=left?110+p.x%160:750+p.x%160,v=(phase+p.phase)%1,b=230+v*1065;ctx.globalAlpha=visibility(a,b)*(.4+.3*Math.cos(t+p.turn));if(left){leaf(a,b,p.size*1.6,Math.sin(t+p.turn)*.25,col('#ffa679',i,.7));leaf(a,b,p.size*.8,0,col('#ffd6aa',i,.8));}else shard(a,b,p.size,Math.sin(t+p.turn)*.3,'#a9dcff',i);}
    else if(id==='red-duality')for(const side of [-1,1]){const points=Array.from({length:70},(_,i)=>{const y=275+i*14;return [512+side*250+Math.sin(y*.011+t)*35,y];});trail(points,side<0?'#f6a0b8':'#eae2f0',side+1,intensity*.45,2);for(let i=0;i<8;i++){const v=(phase+i/8)%1,y=250+v*1030,a=512+side*250+Math.sin(y*.011+t)*35;ctx.globalAlpha=visibility(a,y)*.85;poly([[a,y-8],[a+5,y],[a,y+8],[a-5,y]],col(side<0?'#efa2b5':'#f4edf4',i));}}
    else if(id==='dragon-trail'){
      for(const side of [-1,1]){const points=Array.from({length:70},(_,i)=>{const a=i/69*Math.PI*1.2+Math.sin(t)*.08;return [512+side*(195+Math.sin(a)*160),790+Math.cos(a)*370];});trail(points,'#91c7ff',0,intensity*.4,3);for(let i=0;i<8;i++){const a=phase*TAU+i*.11,x=512+side*(195+Math.sin(a)*155),y=790+Math.cos(a)*365;ctx.globalAlpha=visibility(x,y)*(.5-i*.045);poly([[x,y],[x-side*22,y-18],[x-side*5,y+15]],col('#a0d6ff',i,.8));}const y=550+Math.sin(t)*70;ctx.globalAlpha=intensity*.4;poly([[512+side*240,y],[512+side*330,y-100],[512+side*370,y-35],[512+side*290,y+25]],col('#b2dfff',1,.55));}
    }else if(id==='samurai-cut'){
      for(let k=0;k<3;k++){const v=(phase+k/3)%1,alpha=intensity*pulse(v)*.55;ctx.save();ctx.translate(512,770);ctx.rotate(-.5+k*.7+Math.sin(t)*.08);ctx.globalAlpha=alpha;ctx.strokeStyle=col('#f2d7ab',k);ctx.lineWidth=2+2*pulse(v);ctx.beginPath();ctx.ellipse(0,0,345,145+k*25,0,-1.4,1.2);ctx.stroke();ctx.restore();}for(let i=0;i<Math.ceil(n*.4);i++){const p=particles[i],v=(phase+p.phase)%1,a=p.x+Math.sin(t+p.turn)*18,b=230+v*1065;ctx.globalAlpha=visibility(a,b)*.6;leaf(a,b,p.size*.7,t+p.turn,col('#eeb1c3',i));}
    }else if(id==='viper-coils')for(const side of [-1,1])for(let k=0;k<2;k++){const points=Array.from({length:80},(_,i)=>{const y=260+i*13;return [512+side*315+Math.sin(y*.014+t+k*Math.PI)*34,y];});trail(points,k?'#efd084':'#a8e3b4',k,intensity*(k?.28:.44),2.3);const a=512+side*315+Math.sin(t+k*Math.PI)*34;ctx.globalAlpha=intensity*.8;poly([[a,350],[a+9,370],[a,415],[a-9,370]],col(k?'#f5d993':'#b9edc2',k));}
    else if(id==='picto-paint'){
      const paints=['#eca7c0','#9fcce8','#f0d58d','#b4d9a4','#c6b3ea'];for(let k=0;k<5;k++){ctx.save();ctx.translate(512,770);ctx.rotate(k*TAU/5+Math.sin(t)*.1);ctx.globalAlpha=intensity*(.18+.15*Math.sin(t+k)**2);ctx.strokeStyle=col(paints[k],k);ctx.lineCap='round';ctx.lineWidth=10+k*2;ctx.beginPath();ctx.ellipse(0,0,315,225+k*8,0,.1,.7);ctx.stroke();ctx.restore();}for(let i=0;i<Math.ceil(n*.6);i++){const p=particles[i],a=p.x+Math.sin(t+p.turn)*14,b=p.y+Math.cos(t+p.turn)*10;ctx.globalAlpha=visibility(a,b)*(.4+.4*pulse((phase+p.phase)%1));if(i%4===0)star(a,b,p.size,paints[i%5],i);else dot(a,b,p.size*.6,col(paints[i%5],i,.75));}
    }else if(id==='ifrit-embers')for(let i=0;i<n;i++){const p=particles[i],v=(phase+p.phase)%1,a=p.x+Math.sin(t+p.turn)*18,b=1295-v*1065;ctx.globalAlpha=visibility(a,b)*.85;leaf(a,b,p.size*(.6+pulse(v)*.5),Math.sin(t+p.turn)*.3,col(i%3?'#f9b372':'#ed937d',i,.8));dot(a,b,1.4,col('#ffe3a7',i));}
    else if(id==='shiva-flakes')for(let i=0;i<Math.ceil(n*.65);i++){const p=particles[i],v=(phase+p.phase)%1,a=p.x+Math.sin(t+p.turn)*12,b=230+v*1065,s=p.size*1.2;ctx.save();ctx.translate(a,b);ctx.rotate(t/6+p.turn);ctx.globalAlpha=visibility(a,b)*.75;for(let k=0;k<6;k++){ctx.rotate(TAU/6);line([[0,0],[0,-s]],col('#d3efff',i),1.3);line([[-s*.25,-s*.65],[0,-s*.45],[s*.25,-s*.65]],col('#acd7ff',i),1);}ctx.restore();}
    else if(id==='ramuh-arcs')for(const side of [-1,1])for(let k=0;k<3;k++){const a=512+side*(285+k*28),points=Array.from({length:24},(_,i)=>[a+Math.sin(i*3.71+t*2+k)*17+Math.sin(i*2.1-t)*8,300+i*40]);const alpha=intensity*(.2+.25*Math.sin(t+k)**2);trail(points,'#d8b5ff',k,alpha,1.8);for(let i=3;i<22;i+=6){const [px,py]=points[i];ctx.globalAlpha=alpha;line([[px,py],[px+side*34,py+18],[px+side*22,py+62]],col('#c5b5ff',k),1);}}
    else if(id==='leviathan-tide'){
      for(const side of [-1,1])for(let k=0;k<4;k++){const points=Array.from({length:70},(_,i)=>{const y=260+i*14.7;return [512+side*(300+k*14)+Math.sin(y*.009+t+k*.4)*28,y];});trail(points,'#9cdce9',k,intensity*(.12+k*.035),1.5);}for(let i=0;i<Math.ceil(n*.6);i++){const p=particles[i],v=(phase+p.phase)%1,a=i%2?820+p.x%80:115+p.x%80,b=1295-v*1065;ctx.globalAlpha=visibility(a,b)*.65;leaf(a,b,p.size*.55,0,col('#b8eafa',i));}
    }else if(id==='garuda-feathers'){
      for(let i=0;i<Math.ceil(n*.65);i++){const p=particles[i],a=t+p.turn,r=300+Math.sin(t+p.turn)*35,x=512+Math.cos(a)*r,y=770+Math.sin(a)*r*1.25;ctx.globalAlpha=visibility(x,y)*.65;leaf(x,y,p.size*1.5,a+.8,col('#c6ead1',i,.7));line([[x,y],[x-Math.sin(a)*7,y+Math.cos(a)*12]],col('#ecfae9',i,.6));}for(let k=0;k<3;k++){ctx.save();ctx.translate(512,770);ctx.rotate(k*Math.PI/3+Math.sin(t)*.1);ctx.globalAlpha=intensity*.17;ctx.strokeStyle=col('#c3e9d0',k);ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(0,0,340,220+k*30,0,.2,Math.PI*1.4);ctx.stroke();ctx.restore();}
    }
    ctx.restore();
  }
}
