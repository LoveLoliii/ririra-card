import * as THREE from './vendor/three/three.module.js';

const presets=[
  ['original','原始配色','保留模型当前材质和已烘焙的配色。'],
  ['soft','柔和卡通','柔和明暗、暖色亮部，适合人物肖像。'],
  ['cel','赛璐璐','分区阴影与少量色阶，更强调动画感。'],
  ['sketch','铅笔素描','纸色、细排线与暗边，保留角色轮廓。'],
  ['holo','全息镭射','随观察角度变化的虹彩和边缘亮色。']
];

export function createRenderStyles({onChange}){
  const mode={value:0},strength={value:.7},keyDirection={value:new THREE.Vector3(-.4,.65,1).normalize()},attached=new WeakSet();
  try{const saved=JSON.parse(localStorage.getItem('card.renderStyle'));if(saved&&presets.some(p=>p[0]===saved.id)){mode.value=presets.findIndex(p=>p[0]===saved.id);const value=Number(saved.strength);strength.value=Number.isFinite(value)?THREE.MathUtils.clamp(value,0,1):.7;}}catch{}
  const panel=document.createElement('section');panel.className='render-styles';panel.setAttribute('aria-label','渲染风格');
  panel.innerHTML=`<div class="section-label">渲染风格</div><div class="style-grid"></div><p id="style-description"></p><div class="range-block"><label class="range-label" for="style-strength">风格强度<output id="style-strength-value"></output></label><input id="style-strength" type="range" min="0" max="100" step="1" value="${Math.round(strength.value*100)}"></div><p class="style-help">作用于人物，卡面文字与边框保持清晰。</p>`;
  const css=document.createElement('style');css.textContent='.render-styles{padding-bottom:18px;border-bottom:1px solid var(--line)}.style-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.style-grid button{border:1px solid #ffffff1c;border-radius:6px;background:#ffffff04;color:#c9b9c5;padding:10px 5px;font:inherit;font-size:12px}.style-grid button[aria-pressed="true"]{border-color:#d3a79d99;background:#d3a79d1c;color:#f3d7ca}.style-grid button:hover{border-color:#d3a79d77}#style-description{font-size:11px;color:#c6aea8;line-height:1.8;margin:10px 0}.style-help{font-size:10px;color:#968696;line-height:1.7;margin:6px 0 0}';document.head.append(css);
  const buttons=[];
  for(const [index,preset] of presets.entries()){const button=document.createElement('button');button.textContent=preset[1];button.dataset.style=preset[0];button.onclick=()=>{mode.value=index;update();};panel.querySelector('.style-grid').append(button);buttons.push(button);}
  function update(){buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===mode.value)));panel.querySelector('#style-description').textContent=presets[mode.value][2];panel.querySelector('#style-strength-value').value=`${Math.round(strength.value*100)}%`;const slider=panel.querySelector('#style-strength');slider.disabled=mode.value===0;try{localStorage.setItem('card.renderStyle',JSON.stringify({id:presets[mode.value][0],strength:strength.value}));}catch{}onChange?.({id:presets[mode.value][0],strength:strength.value});}
  panel.querySelector('#style-strength').oninput=e=>{strength.value=+e.target.value/100;update();};
  document.querySelector('.side').prepend(panel);update();
  function attach(material){if(attached.has(material))return;attached.add(material);
    if(!material.isMeshBasicMaterial&&!material.isMeshStandardMaterial&&!material.isMeshPhysicalMaterial)return;
    const original=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey.bind(material),basic=material.isMeshBasicMaterial;
    material.onBeforeCompile=(shader,renderer)=>{
      original(shader,renderer);shader.uniforms.uCardStyle=mode;shader.uniforms.uCardStyleStrength=strength;shader.uniforms.uCardStyleKey=keyDirection;
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCardStyleNormal;\nvarying vec3 vCardStyleView;');
      const normal=basic?`\n#if defined(USE_ENVMAP) || defined(USE_SKINNING)\nvCardStyleNormal=transformedNormal;\n#else\nvec3 cardObjectNormal=normal;\n#ifdef USE_INSTANCING\ncardObjectNormal=mat3(instanceMatrix)*cardObjectNormal;\n#endif\nvCardStyleNormal=normalMatrix*cardObjectNormal;\n#endif\n`:'\nvCardStyleNormal=transformedNormal;\n';
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvCardStyleView=-mvPosition.xyz;'+normal);
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform int uCardStyle;\nuniform vec3 uCardStyleKey;\nuniform float uCardStyleStrength;\nvarying vec3 vCardStyleNormal;\nvarying vec3 vCardStyleView;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`
        if(uCardStyle>0 && uCardStyleStrength>0.0){
          vec3 cardN;
          #ifdef FLAT_SHADED
          cardN=normalize(cross(dFdx(-vCardStyleView),dFdy(-vCardStyleView)));
          #else
          if(dot(vCardStyleNormal,vCardStyleNormal)>.000001){cardN=normalize(vCardStyleNormal);if(!gl_FrontFacing)cardN=-cardN;}
          else{cardN=normalize(cross(dFdx(-vCardStyleView),dFdy(-vCardStyleView)));}
          #endif
          vec3 cardV=normalize(vCardStyleView);
          vec3 cardKey=normalize((viewMatrix*vec4(uCardStyleKey,0.)).xyz);
          float cardD=dot(cardN,cardKey);
          float cardFacing=abs(dot(cardN,cardV));
          vec3 cardBase=gl_FragColor.rgb,cardColor=cardBase;
          if(uCardStyle==1){
            float softLight=smoothstep(-.35,.8,cardD);
            cardColor=cardBase*mix(vec3(.76,.72,.86),vec3(1.10,1.04,1.0),softLight);
            cardColor=mix(cardColor,vec3(1.,.82,.72),.035*softLight);
          }else if(uCardStyle==2){
            float aa=max(fwidth(cardD)*1.5,.015);
            float band=smoothstep(.58-aa,.58+aa,cardD);
            vec3 paint=pow(floor(sqrt(max(cardBase,vec3(0.)))*7.+.5)/7.,vec3(2.));
            cardColor=paint*mix(vec3(.49,.43,.65),vec3(1.08,1.04,1.),band);
            cardColor*=mix(.65,1.,smoothstep(.02,.2,cardFacing));
          }else if(uCardStyle==3){
            float lum=dot(cardBase,vec3(.2126,.7152,.0722));
            float shade=clamp((1.-cardD)*.45+(1.-sqrt(max(lum,0.)))*.3,0.,1.);
            float a=sin((gl_FragCoord.x+gl_FragCoord.y)*.65);
            float b=sin((gl_FragCoord.x-gl_FragCoord.y)*.71);
            float hatch=1.-.40*shade*(1.-smoothstep(-.2,.2,a))-.18*smoothstep(.4,.8,shade)*(1.-smoothstep(-.2,.2,b));
            cardColor=vec3(.88,.84,.74)*(.58+.42*sqrt(max(lum,0.)))*hatch;
            cardColor*=mix(.22,1.,smoothstep(.025,.18,cardFacing));
          }else if(uCardStyle==4){
            float phase=(1.-cardFacing)*5.5+cardN.y*1.7+cardN.x*1.2;
            vec3 rainbow=.5+.5*cos(phase+vec3(0.,2.094,4.188));
            float rim=pow(1.-cardFacing,2.);
            cardColor=cardBase*.55+rainbow*(.16+.55*rim);
            cardColor*=.96+.04*sin(gl_FragCoord.y*.7);
          }
          gl_FragColor.rgb=mix(cardBase,cardColor,uCardStyleStrength);
        }
        #include <tonemapping_fragment>
      `);
    };
    material.customProgramCacheKey=()=>key()+'|card-style-v1';material.needsUpdate=true;
  }
  return {attach,setKeyDirection:direction=>keyDirection.value.copy(direction),getState:()=>({id:presets[mode.value][0],name:presets[mode.value][1],strength:strength.value})};
}
