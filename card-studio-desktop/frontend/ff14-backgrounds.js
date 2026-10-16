// Original graphic interpretations of FFXIV places and job motifs.
export const ff14Themes=[
  ['limsa','利姆萨海风','白色港塔、海港帆影与蔚蓝波光。','城邦'],
  ['gridania','格里达尼亚','古树拱门、林间溪流与暖色灯火。','城邦'],
  ['uldah','乌尔达哈','沙金穹顶、拱廊与夜色商都。','城邦'],
  ['ishgard','伊修加德','高耸尖塔、哥特窗与飞雪。','城邦'],
  ['kugane','黄金港灯夜','红桥、楼阁与层叠灯笼。','城邦'],
  ['crystarium','水晶都晨光','紫晶巨塔、玻璃穹顶与晨色。','城邦'],
  ['eulmore','游末邦鎏金','海崖上的鎏金楼台与珠宝装饰。','城邦'],
  ['sharlayan','旧萨雷安','白色学府、海湾与知识星图。','城邦'],
  ['radz','拉札罕彩庭','宝石色穹顶、彩纹拱门与庭园。','城邦'],
  ['amaurot','亚马乌罗提','深海都市、装饰艺术高楼与幽蓝微光。','城邦'],
  ['hydaelyn','母水晶辉光','悬浮的蓝白水晶与放射以太光。','水晶与传说'],
  ['dragonsong','龙诗苍穹','苍蓝龙翼、山巅与环形誓约纹。','水晶与传说'],
  ['bahamut','赤月龙影','裂开的赤月、龙影与余烬。','水晶与传说'],
  ['allag','亚拉戈回路','浮空装置、赤蓝能源与古代科技。','水晶与传说'],
  ['astrologian','占星天球','黄铜天球仪、星盘与六张秘卡。','职业'],
  ['darkknight','暗黑之誓','黑色重剑、猩红裂隙与暗焰。','职业'],
  ['whitemage','白魔祈愿','百合、羽翼与青白疗愈光。','职业'],
  ['scholar','学者秘典','展开的书页、几何阵与妖精流光。','职业'],
  ['samurai','武士绯樱','绯红日轮、刀影与樱花。','职业'],
  ['sage','贤者浮晶','四枚浮游晶体与蓝绿以太轨迹。','职业']
];

export function paintFF14(id,width=1024){
  const c=document.createElement('canvas');c.width=width;c.height=width*1.5;const x=c.getContext('2d');x.scale(width/1024,width/1024);
  let seed=77;const r=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const colors={limsa:['#195678','#071c35'],gridania:['#315c44','#101f22'],uldah:['#705537','#201a2c'],ishgard:['#42516d','#131c31'],kugane:['#633542','#1e172c'],crystarium:['#605478','#201f3b'],eulmore:['#68466e','#211b35'],sharlayan:['#3c6475','#122638'],radz:['#474573','#211a3a'],amaurot:['#164f58','#071d2b'],hydaelyn:['#477492','#132b48'],dragonsong:['#2c537c','#131c37'],bahamut:['#6b2736','#1b1221'],allag:['#2d4c66','#101a2d'],astrologian:['#3d3664','#16172f'],darkknight:['#4d213d','#140f22'],whitemage:['#416b62','#122b2d'],scholar:['#315857','#14262c'],samurai:['#61363e','#211721'],sage:['#2c626b','#122935']};
  const [light,dark]=colors[id];const gold='#dbc295';
  const gradient=x.createRadialGradient(512,650,30,512,760,950);gradient.addColorStop(0,light);gradient.addColorStop(1,dark);x.fillStyle=gradient;x.fillRect(0,0,1024,1536);
  const poly=(p,fill,stroke,width=1)=>{x.beginPath();p.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.closePath();if(fill){x.fillStyle=fill;x.fill();}if(stroke){x.strokeStyle=stroke;x.lineWidth=width;x.stroke();}};
  const line=(p,color,width=1)=>{x.beginPath();p.forEach(([a,b],i)=>i?x.lineTo(a,b):x.moveTo(a,b));x.strokeStyle=color;x.lineWidth=width;x.stroke();};
  const circle=(a,b,r,fill,stroke,width=1)=>{x.beginPath();x.arc(a,b,r,0,Math.PI*2);if(fill){x.fillStyle=fill;x.fill();}if(stroke){x.strokeStyle=stroke;x.lineWidth=width;x.stroke();}};
  const glow=(a,b,r,color)=>{const g=x.createRadialGradient(a,b,0,a,b,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');x.fillStyle=g;x.fillRect(a-r,b-r,r*2,r*2);};
  const rect=(a,b,w,h,color)=>{x.fillStyle=color;x.fillRect(a,b,w,h);};
  const stars=(n,color='#e5efff80')=>{for(let i=0;i<n;i++)circle(80+r()*864,300+r()*920,.5+r()*1.5,color);};
  const mountain=(base,h,color)=>{const p=[[0,1400],[0,base]];for(let a=0;a<=1100;a+=90)p.push([a,base-r()*h]);p.push([1024,1400]);poly(p,color);};
  const tower=(a,base,w,h,color,spire=true)=>{rect(a-w/2,base-h,w,h,color);if(spire)poly([[a-w*.7,base-h],[a,base-h-w*1.2],[a+w*.7,base-h]],color);for(let b=base-h+30;b<base-20;b+=40)rect(a-3,b,6,14,'#e0d5b750');};
  const dome=(a,b,w,color)=>{rect(a-w,b,w*2,150,color);x.fillStyle=color;x.beginPath();x.ellipse(a,b,w,w*.7,0,Math.PI,Math.PI*2);x.fill();line([[a,b-w*.7],[a,b-w*.7-30]],gold+'80',2);};
  const crystal=(a,b,w,h,color)=>{poly([[a,b-h/2],[a+w,b-h*.2],[a+w*.6,b+h*.4],[a,b+h/2],[a-w,b+h*.15],[a-w*.8,b-h*.2]],color,'#b7ebf580',1.5);poly([[a,b-h/2],[a+w,b-h*.2],[a,b+h/2]],'#deffff28');line([[a,b-h/2],[a,b+h/2]],'#e0ffff80',2);};
  const petal=(a,b,size,color)=>{x.save();x.translate(a,b);x.rotate(r()*6.28);x.fillStyle=color;x.beginPath();x.ellipse(0,0,size,size*.4,0,0,7);x.fill();x.restore();};
  const wing=(a,b,side,color)=>{for(let i=0;i<10;i++)poly([[a,b],[a+side*(110+i*18),b-240+i*21],[a+side*(80+i*17),b-80+i*15]],color);};
  x.save();x.beginPath();x.roundRect(62,275,900,1020,130);x.clip();
  if(id==='limsa'){
    glow(770,440,230,'#d9efff38');circle(770,440,70,'#c3dce580');
    for(let i=0;i<38;i++){let b=940+i*9;line([[60,b],[964,b]],i%3?'#75c7d41c':'#bddce940',1.5);}
    poly([[60,920],[100,660],[230,620],[290,910]],'#183a50');tower(170,925,65,380,'#b0c6cc',false);dome(170,545,38,'#d0d7d2');
    tower(815,1000,75,290,'#adc4cb',false);tower(895,1040,45,220,'#6f98aa',false);
    line([[100,850],[915,850]],'#b4cbd7',8);for(let i=0;i<8;i++)line([[130+i*105,850],[130+i*105,960]],'#8faebc',6);
    for(const [a,b]of [[290,1030],[760,1120]]){line([[a,b],[a,b-180]],'#d4cdbb',3);poly([[a+5,b-175],[a+95,b-35],[a+5,b-40]],'#e7ddd2a0');poly([[a-5,b-130],[a-65,b-35],[a-5,b-40]],'#b4d4dda0');poly([[a-75,b],[a+105,b],[a+70,b+22],[a-55,b+22]],'#152c41');}
  }else if(id==='gridania'){
    glow(512,510,300,'#b1cc7350');mountain(1120,100,'#224039');
    for(const side of [-1,1]){const a=512+side*390;poly([[a-75,1320],[a-40,650],[a-100,290],[a+30,290],[a+70,650],[a+50,1320]],'#192f29');line([[a,700],[a-side*150,440],[512,340]],'#254535',45);for(let i=0;i<18;i++)circle(a+r()*200-100,310+r()*260,40+r()*70,'#35563a99');}
    poly([[420,1300],[485,980],[550,870],[530,1300]],'#79b4ad45');for(let i=0;i<5;i++){let a=160+i*170,b=850+r()*180;line([[a,b-90],[a,b+40]],'#8d9c6d70',2);glow(a,b,50,'#f2cc6530');rect(a-9,b-15,18,30,'#e6bd6a99');}stars(55,'#d3e49f80');
  }else if(id==='uldah'){
    circle(735,440,65,'#e5cc9b50');mountain(1040,120,'#a78b5930');
    for(let i=0;i<8;i++){let a=90+i*125;tower(a,1130,64,170+r()*170,'#9c7b5080',false);}
    dome(760,810,130,'#ad8b58');dome(230,920,90,'#c09c6260');
    for(let i=0;i<7;i++){let a=80+i*145;rect(a,1050,14,250,'#b8996755');x.strokeStyle='#b8996755';x.lineWidth=13;x.beginPath();x.arc(a+72,1050,65,Math.PI,0);x.stroke();}
    for(let i=0;i<80;i++)circle(80+r()*864,650+r()*600,1+r()*2,'#e2be7159');
  }else if(id==='ishgard'){
    mountain(1000,250,'#8d9ca440');mountain(1140,170,'#3d5065');
    for(const [a,h,w]of [[140,650,60],[260,440,45],[780,540,55],[900,740,65]]){tower(a,1260,w,h,'#7890a085');tower(a+w*.6,1260,w*.4,h*.7,'#35465e');}
    x.strokeStyle='#a8b8c34a';x.lineWidth=5;x.beginPath();x.moveTo(80,950);x.bezierCurveTo(80,500,350,330,512,310);x.bezierCurveTo(674,330,944,500,944,950);x.stroke();stars(200,'#ebf2ff85');
  }else if(id==='kugane'){
    circle(770,430,85,'#e5b9a460');
    for(const a of [170,840])for(let i=0;i<4;i++){const b=610+i*135,w=130-i*17;rect(a-w*.65,b,w*1.3,95,'#533240');poly([[a-w,b],[a,b-65],[a+w,b],[a+w*1.25,b-10],[a+w,b+15],[a-w,b+15],[a-w*1.25,b-10]],'#ae6b626b');for(let j=-2;j<=2;j++)rect(a+j*25,b+25,9,35,'#e8b57670');}
    x.strokeStyle='#ba7869';x.lineWidth=13;x.beginPath();x.ellipse(512,1300,510,170,0,Math.PI,Math.PI*2);x.stroke();
    for(let i=0;i<8;i++){let a=100+i*118,b=460+Math.sin(i*.6)*60;line([[a,280],[a,b]],'#c1917850');glow(a,b,40,'#f7b36f28');x.fillStyle='#e19b6b99';x.beginPath();x.ellipse(a,b,17,25,0,0,7);x.fill();}
  }else if(id==='crystarium'){
    glow(540,650,350,'#c7a5e14a');crystal(770,650,90,600,'#8e7db9a0');crystal(730,930,38,250,'#b3a0c26b');
    for(const a of [230,760]){x.strokeStyle='#a9c7cf60';x.lineWidth=3;x.beginPath();x.ellipse(a,1070,230,260,0,Math.PI,0);x.stroke();for(let i=-2;i<=2;i++)line([[a+i*70,850+Math.abs(i)*35],[a+i*90,1150]],'#bbcad344',2);line([[a-220,1060],[a+220,1060]],'#c2c9d455',3);}
    tower(180,1230,28,270,'#bbc9d26b',false);tower(900,1230,28,270,'#bbc9d26b',false);stars(90);
  }else if(id==='eulmore'){
    glow(512,550,340,'#cca98125');poly([[300,1340],[360,1000],[330,900],[720,900],[690,1100],[760,1340]],'#282d43');
    for(let i=0;i<5;i++){let b=1000-i*115,w=250-i*28;rect(512-w,b,w*2,18,'#c9a46e90');rect(512-w+20,b-100,w*2-40,100,'#725064');for(let a=512-w+40;a<512+w-20;a+=45)rect(a,b-80,12,45,'#e1bd7b65');}dome(512,420,95,'#c2a06b80');
    for(const a of [110,914]){line([[a,300],[a,1250]],'#d7bb9150',2);for(let b=350;b<1250;b+=65)circle(a,b,8,null,'#d7bb9180',2);}stars(65,'#e4c79385');
  }else if(id==='sharlayan'){
    circle(760,440,73,null,'#e4d4a675',2);for(let i=0;i<8;i++){let a=i*Math.PI/4;line([[760+Math.cos(a)*90,440+Math.sin(a)*90],[760+Math.cos(a)*108,440+Math.sin(a)*108]],'#e4d4a675');}
    for(const a of [170,800]){dome(a,900,120,'#becfd190');for(let i=-2;i<=2;i++){rect(a+i*38,920,9,230,'#c8d5d58a');}rect(a-135,1150,270,22,'#a9c3cd90');}
    for(let i=0;i<22;i++)line([[60,1200+i*6],[964,1200+i*6]],'#84c5d020');line([[130,620],[250,550],[320,650],[260,735]],'#d2d4b85a');stars(65);
  }else if(id==='radz'){
    for(let i=0;i<4;i++){const a=140+i*250;dome(a,850+r()*120,80,['#ad697b85','#57aca085','#bd986585','#807bb68a'][i]);}
    for(const a of [90,934]){rect(a-20,450,40,850,'#c29f7f80');x.strokeStyle='#d7af854f';x.lineWidth=10;x.beginPath();x.moveTo(a,690);x.quadraticCurveTo(512,130,a===90?934:90,690);x.stroke();}
    for(let i=0;i<14;i++){let a=100+i*63;poly([[a,1160],[a+30,1120],[a+60,1160],[a+30,1200]],i%2?'#6cb8ab60':'#d0a17570');}stars(80,'#e2c5996b');
  }else if(id==='amaurot'){
    glow(512,500,360,'#71b4b230');for(let i=0;i<11;i++){const a=65+i*90,h=250+r()*450,w=40+r()*28;rect(a,1300-h,w,h,'#4f8d9570');poly([[a-5,1300-h],[a+w*.5,1240-h],[a+w+5,1300-h]],'#72a9ad70');for(let j=0;j<3;j++)rect(a+8+j*13,1320-h,2,h-35,'#a8d8cd38');}
    for(let i=0;i<50;i++){const a=80+r()*864,b=300+r()*950;circle(a,b,2+r()*7,null,'#8ad4d730');}line([[80,1190],[944,1190]],'#9ed6d940',3);stars(75,'#a5e6dd70');
  }else if(id==='hydaelyn'){
    glow(512,760,470,'#9cd9fc66');for(let i=0;i<30;i++){let a=i*Math.PI/15;line([[512+Math.cos(a)*170,730+Math.sin(a)*170],[512+Math.cos(a)*700,730+Math.sin(a)*700]],'#c1ecff24',i%2?2:5);}
    for(const [a,b,w,h]of [[512,760,105,650],[220,620,42,230],[815,920,50,280],[280,1110,35,180],[790,430,28,150]])crystal(a,b,w,h,'#8dc9e080');stars(150,'#effcffb0');
  }else if(id==='dragonsong'){
    circle(512,715,330,null,'#a5c8e55a',2);circle(512,715,345,null,'#a5c8e530',1);mountain(1250,260,'#718ba555');
    for(const side of [-1,1]){poly([[512,520],[512+side*180,360],[512+side*370,400],[512+side*300,600],[512+side*395,740],[512+side*240,690],[512+side*190,840],[512+side*110,650]],'#8cb8d145','#c5e4f050',2);}
    line([[512,495],[480,440],[510,405],[550,450],[530,520]],'#b4d5e070',4);stars(110);
  }else if(id==='bahamut'){
    glow(512,570,340,'#ec63433d');circle(512,570,240,'#a43c4790','#e1846860',3);for(let i=0;i<8;i++){let a=i*Math.PI/4;line([[512+Math.cos(a)*35,570+Math.sin(a)*35],[512+Math.cos(a+.08)*145,570+Math.sin(a+.08)*145],[512+Math.cos(a)*240,570+Math.sin(a)*240]],'#231b2d',5);}
    for(const side of [-1,1])poly([[512,610],[512+side*170,490],[512+side*380,590],[512+side*270,710],[512+side*360,840],[512+side*210,780],[512+side*140,920]],'#181729d0','#d27b7035');mountain(1330,140,'#231625');stars(120,'#f8a07085');
  }else if(id==='allag'){
    for(let i=0;i<6;i++){const b=400+i*155;for(const side of [-1,1]){const a=512+side*390;line([[a,b],[a-side*100,b],[a-side*140,b+40],[a-side*140,b+90]],i%2?'#e5a1a055':'#6fcddd70',3);circle(a-side*140,b+90,7,i%2?'#d87f8580':'#74d6e4a0');}}
    for(const [a,b]of [[230,640],[810,1030]]){poly([[a,b-100],[a+95,b-45],[a+95,b+50],[a,b+105],[a-95,b+50],[a-95,b-45]],'#26485980','#8dbaca70',2);crystal(a,b,25,95,'#d2758590');}circle(512,760,330,null,'#84a4cd40',2);stars(65);
  }else if(id==='astrologian'){
    for(let i=0;i<5;i++){x.save();x.translate(512,760);x.rotate(i*.55);x.strokeStyle='#d3b87e70';x.lineWidth=i%2?1:3;x.beginPath();x.ellipse(0,0,330,110+i*38,0,0,7);x.stroke();x.restore();}
    circle(512,760,365,null,'#d3b87e50');for(let i=0;i<6;i++){let a=i*Math.PI/3-.3,b=512+Math.cos(a)*330,d=760+Math.sin(a)*330;x.save();x.translate(b,d);x.rotate(a+Math.PI/2);rect(-25,-40,50,80,'#26233c');x.strokeStyle='#d7bf85a0';x.strokeRect(-25,-40,50,80);poly([[0,-20],[12,0],[0,20],[-12,0]],null,'#d7bf8580');x.restore();}stars(180);
  }else if(id==='darkknight'){
    glow(512,800,370,'#a83f6b30');for(const side of [-1,1]){line([[512+side*100,300],[512+side*170,480],[512+side*110,620],[512+side*250,830],[512+side*175,1020],[512+side*280,1280]],'#d4578150',4);}
    x.save();x.translate(760,780);x.rotate(-.18);poly([[-24,-340],[24,-340],[35,180],[0,300],[-35,180]],'#171725','#b48aa575',2);poly([[-110,-350],[-45,-380],[0,-355],[45,-380],[110,-350],[75,-328],[-75,-328]],'#8e647b90');rect(-12,-460,24,105,'#211a2e');circle(0,-470,23,'#74516a');x.restore();mountain(1300,130,'#211728');stars(90,'#de82a45e');
  }else if(id==='whitemage'){
    glow(512,740,380,'#bbebc440');wing(512,650,-1,'#d8eee42b');wing(512,650,1,'#d8eee42b');
    for(const [a,b]of [[190,990],[810,1050],[245,620]]){line([[a,b+170],[a,b]],'#9dc5a080',4);for(let i=0;i<6;i++){x.save();x.translate(a,b);x.rotate(i*Math.PI/3);x.fillStyle='#e4eee6a0';x.beginPath();x.ellipse(0,-27,11,34,0,0,7);x.fill();x.restore();}circle(a,b,7,'#dccb94');}stars(130,'#daefbd80');
  }else if(id==='scholar'){
    circle(512,770,325,null,'#a2d8b34a',2);poly([[512,415],[820,950],[200,950]],null,'#a2d8b335',2);
    x.save();x.translate(512,1060);x.rotate(-.1);poly([[0,-35],[-210,-100],[-230,65],[0,120],[230,65],[210,-100]],'#b8c9aa70','#dce3bc70',2);line([[0,-35],[0,120]],'#e6e8cc90',3);for(let i=0;i<6;i++){line([[-180,-60+i*20],[-30,-10+i*18]],'#4c756c80',2);line([[30,-10+i*18],[180,-60+i*20]],'#4c756c80',2);}x.restore();for(const [a,b]of [[200,520],[800,690]]){glow(a,b,65,'#acedae40');petal(a-13,b,23,'#c9efcc90');petal(a+13,b,23,'#c9efcc90');circle(a,b,5,'#edffe3');}stars(80,'#b4e5c480');
  }else if(id==='samurai'){
    circle(700,570,185,'#b85b5d80');line([[80,500],[180,550],[300,430],[360,420]],'#b28b8960',8);for(let i=0;i<80;i++)petal(80+r()*840,350+r()*850,3+r()*7,'#e9b1bd75');
    x.save();x.translate(780,910);x.rotate(.32);poly([[-7,-350],[8,-350],[12,250],[-5,280]],'#d7d4c280');rect(-35,240,70,10,'#b99575');rect(-8,250,18,130,'#322531');for(let i=0;i<8;i++)line([[-8,260+i*14],[10,273+i*14]],'#c19c8c90',3);x.restore();mountain(1320,100,'#30252f');
  }else if(id==='sage'){
    circle(512,760,320,null,'#9bede358',2);circle(512,760,350,null,'#9bede324');
    for(let i=0;i<4;i++){let a=(i*.5+.25)*Math.PI,b=512+Math.cos(a)*310,d=760+Math.sin(a)*310;x.save();x.translate(b,d);x.rotate(a-Math.PI/2);poly([[-18,-90],[0,-140],[18,-90],[28,55],[0,95],[-28,55]],'#88beca99','#d3f7ec99',2);crystal(0,-15,10,85,'#d4fff580');x.restore();glow(b,d,85,'#7fe3d92d');}for(let i=0;i<3;i++){x.strokeStyle='#c2f4dc30';x.lineWidth=2;x.beginPath();x.ellipse(512,760,250+i*22,155+i*40,.55,0,7);x.stroke();}stars(110,'#bdfff085');
  }
  x.restore();const fade=x.createLinearGradient(0,0,0,1536);fade.addColorStop(0,dark);fade.addColorStop(.16,dark+'ee');fade.addColorStop(.30,dark+'00');fade.addColorStop(.76,dark+'00');fade.addColorStop(.87,dark+'e8');fade.addColorStop(1,dark);x.fillStyle=fade;x.fillRect(0,0,1024,1536);
  x.strokeStyle=gold+'45';x.lineWidth=1.5;x.beginPath();x.roundRect(65,275,894,1025,130);x.stroke();line([[100,265],[924,265]],gold+'50');line([[150,1320],[874,1320]],gold+'30');return c;
}
