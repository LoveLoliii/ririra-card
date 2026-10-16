import * as THREE from './vendor/three/three.module.js';

const presets=[
  ['studio','柔光棚拍',{key:90,azimuth:-35,elevation:40,fill:70,rim:35,softness:80,exposure:100,keyColor:'#fff0dc',rimColor:'#b9d9ff'}],
  ['warm','暖阳肖像',{key:110,azimuth:-45,elevation:30,fill:65,rim:45,softness:85,exposure:105,keyColor:'#ffd4a1',rimColor:'#ffe8c1'}],
  ['moon','冷月蓝光',{key:90,azimuth:45,elevation:35,fill:42,rim:100,softness:60,exposure:100,keyColor:'#bad8ff',rimColor:'#94bcff'}],
  ['rose','玫瑰舞台',{key:100,azimuth:-55,elevation:25,fill:50,rim:110,softness:65,exposure:100,keyColor:'#ffd5e3',rimColor:'#bdadff'}],
  ['dramatic','侧光剪影',{key:135,azimuth:-85,elevation:20,fill:18,rim:120,softness:35,exposure:100,keyColor:'#ffe4c4',rimColor:'#8fd9f0'}]
];
const fields=[['key','主光亮度',0,200,1,'%'],['azimuth','主光左右方向',-180,180,1,'°'],['elevation','主光高度',-10,90,1,'°'],['fill','补光亮度',0,150,1,'%'],['rim','轮廓光亮度',0,150,1,'%'],['softness','柔光程度',0,100,1,'%'],['exposure','人物曝光',50,150,1,'%']];

export function createModelLighting({scene,onChange,onDirection}){
  const state={enabled:false,preset:'studio',...presets[0][2]};
  try{const saved=JSON.parse(localStorage.getItem('card.lighting'));if(saved){if(typeof saved.enabled==='boolean')state.enabled=saved.enabled;if(typeof saved.preset==='string')state.preset=saved.preset;for(const [key,,min,max]of fields)if(Number.isFinite(saved[key]))state[key]=THREE.MathUtils.clamp(saved[key],min,max);for(const key of ['keyColor','rimColor'])if(/^#[0-9a-f]{6}$/i.test(saved[key]||''))state[key]=saved[key];}}catch{}
  const hemi=new THREE.HemisphereLight(0xfff3ed,0x655574,2),keyLight=new THREE.DirectionalLight(0xffe5d2,2.8),fillLight=new THREE.DirectionalLight(0xe4ecff,0),rimLight=new THREE.DirectionalLight(0xc8d7ff,1.5);scene.add(hemi,keyLight,fillLight,rimLight);
  const uniforms={uCardLightEnabled:{value:0},uCardLightKey:{value:new THREE.Vector3()},uCardLightFill:{value:new THREE.Vector3()},uCardLightRim:{value:new THREE.Vector3()},uCardLightKeyColor:{value:new THREE.Color()},uCardLightRimColor:{value:new THREE.Color()},uCardLightKeyPower:{value:1},uCardLightFillPower:{value:1},uCardLightRimPower:{value:1},uCardLightSoftness:{value:.8},uCardLightExposure:{value:1}};
  const panel=document.createElement('section');panel.className='model-lighting';panel.setAttribute('aria-label','人物打光');panel.innerHTML='<div class="section-label">人物打光</div><label class="lighting-toggle">启用人物打光<input type="checkbox" id="lighting-enabled"></label><div class="lighting-presets"></div><div class="lighting-main"></div><details><summary>补光、轮廓光与颜色</summary><div class="lighting-more"></div><div class="lighting-colors"><label for="lighting-keyColor">主光颜色<input id="lighting-keyColor" type="color"></label><label for="lighting-rimColor">轮廓光颜色<input id="lighting-rimColor" type="color"></label></div></details><p id="lighting-summary"></p><p class="lighting-help">只影响人物。已烘焙贴图会保留原有阴影；方向打光不会自动生成投影。</p><button id="lighting-reset" class="secondary" type="button">恢复原始光照</button>';
  const css=document.createElement('style');css.textContent='.model-lighting{padding-bottom:18px;border-bottom:1px solid var(--line)}.lighting-toggle{display:flex;justify-content:space-between;align-items:center;color:#d9c7ce;font-size:12px;margin-bottom:12px}.lighting-toggle input{accent-color:#ddb6aa}.lighting-presets{display:grid;grid-template-columns:1fr 1fr;gap:7px}.lighting-presets button{background:#ffffff04;border:1px solid #ffffff1c;border-radius:6px;color:#c9b9c5;padding:8px 3px;font:inherit;font-size:11px}.lighting-presets button[aria-pressed="true"]{border-color:#d3a79d99;background:#d3a79d1c;color:#f3d7ca}.model-lighting summary{cursor:pointer;font-size:11px;color:#ddc4ba;margin-top:13px}.lighting-colors{display:flex;gap:18px;margin-top:13px}.lighting-colors label{font-size:11px;color:#bca8b8;flex:1}.lighting-colors input{display:block;width:100%;height:30px;background:#211c29;border:1px solid #ffffff24;border-radius:4px;margin-top:5px}.lighting-help,#lighting-summary{font-size:10px;color:#968696;line-height:1.8;margin:9px 0}#lighting-summary{color:#c7b0a9}#lighting-reset{width:100%;font-size:11px;padding:7px}.model-lighting input:disabled{opacity:.4;cursor:default}';document.head.append(css);
  const buttons=[];
  for(const [id,name,values]of presets){const button=document.createElement('button');button.dataset.lighting=id;button.textContent=name;button.onclick=()=>{Object.assign(state,values,{enabled:true,preset:id});sync();update();};panel.querySelector('.lighting-presets').append(button);buttons.push(button);}
  for(const [i,[key,label,min,max,step,unit]]of fields.entries()){const block=document.createElement('div');block.className='range-block';const caption=document.createElement('label');caption.className='range-label';caption.htmlFor='lighting-'+key;caption.append(document.createTextNode(label));const out=document.createElement('output');out.id='lighting-'+key+'-value';caption.append(out);const input=document.createElement('input');Object.assign(input,{type:'range',id:'lighting-'+key,min,max,step});input.oninput=()=>{state[key]=Number(input.value);state.preset='custom';update();};block.append(caption,input);panel.querySelector(i<3?'.lighting-main':'.lighting-more').append(block);}
  for(const name of ['keyColor','rimColor'])panel.querySelector('#lighting-'+name).oninput=e=>{state[name]=e.target.value;state.preset='custom';update();};
  panel.querySelector('#lighting-enabled').onchange=e=>{state.enabled=e.target.checked;update();};panel.querySelector('#lighting-reset').onclick=()=>{Object.assign(state,presets[0][2],{enabled:false,preset:'studio'});sync();update();};
  document.querySelector('.render-styles').before(panel);
  function sync(){panel.querySelector('#lighting-enabled').checked=state.enabled;for(const [key]of fields)panel.querySelector('#lighting-'+key).value=state[key];for(const key of ['keyColor','rimColor'])panel.querySelector('#lighting-'+key).value=state[key];}
  function update(){
    const yaw=THREE.MathUtils.degToRad(state.azimuth),height=THREE.MathUtils.degToRad(state.elevation),direction=new THREE.Vector3(Math.sin(yaw)*Math.cos(height),Math.sin(height),Math.cos(yaw)*Math.cos(height));
    uniforms.uCardLightEnabled.value=state.enabled?1:0;uniforms.uCardLightKey.value.copy(direction);uniforms.uCardLightFill.value.set(-direction.x,.15,.9).normalize();uniforms.uCardLightRim.value.set(-direction.x,.3,-.9).normalize();uniforms.uCardLightKeyColor.value.set(state.keyColor);uniforms.uCardLightRimColor.value.set(state.rimColor);uniforms.uCardLightKeyPower.value=state.key/100;uniforms.uCardLightFillPower.value=state.fill/100;uniforms.uCardLightRimPower.value=state.rim/100;uniforms.uCardLightSoftness.value=state.softness/100;uniforms.uCardLightExposure.value=state.exposure/100;
    if(state.enabled){keyLight.position.copy(direction).multiplyScalar(4);keyLight.color.set(state.keyColor);keyLight.intensity=state.key/100*3;fillLight.position.copy(uniforms.uCardLightFill.value).multiplyScalar(4);fillLight.intensity=state.fill/100*.8;hemi.intensity=state.fill/100*1.3;rimLight.position.copy(uniforms.uCardLightRim.value).multiplyScalar(4);rimLight.color.set(state.rimColor);rimLight.intensity=state.rim/100*2;}
    else{keyLight.position.set(-2,3,4);keyLight.color.set(0xffe5d2);keyLight.intensity=2.8;fillLight.intensity=0;hemi.intensity=2;rimLight.position.set(2,1,-2);rimLight.color.set(0xc8d7ff);rimLight.intensity=1.5;}
    onDirection?.(state.enabled?direction:new THREE.Vector3(-.4,.65,1).normalize());
    for(const [key,, ,,,unit]of fields){panel.querySelector('#lighting-'+key+'-value').value=state[key]+unit;panel.querySelector('#lighting-'+key).disabled=!state.enabled;}for(const key of ['keyColor','rimColor'])panel.querySelector('#lighting-'+key).disabled=!state.enabled;buttons.forEach(b=>b.setAttribute('aria-pressed',String(state.enabled&&b.dataset.lighting===state.preset)));panel.querySelector('#lighting-summary').textContent=state.enabled?'当前：'+(presets.find(p=>p[0]===state.preset)?.[1]||'自定义打光'):'当前：原始光照';
    try{localStorage.setItem('card.lighting',JSON.stringify(state));}catch{}onChange?.({...state});
  }
  const attached=new WeakSet();
  function attach(material){if(attached.has(material)||(!material.isMeshBasicMaterial&&!material.isMeshStandardMaterial&&!material.isMeshPhysicalMaterial))return;attached.add(material);const original=material.onBeforeCompile.bind(material),cacheKey=material.customProgramCacheKey(),basic=material.isMeshBasicMaterial;
    material.onBeforeCompile=(shader,renderer)=>{original(shader,renderer);Object.assign(shader.uniforms,uniforms);shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform int uCardLightEnabled;uniform vec3 uCardLightKey;uniform vec3 uCardLightFill;uniform vec3 uCardLightRim;uniform vec3 uCardLightKeyColor;uniform vec3 uCardLightRimColor;uniform float uCardLightKeyPower;uniform float uCardLightFillPower;uniform float uCardLightRimPower;uniform float uCardLightSoftness;uniform float uCardLightExposure;
    `);shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`
      if(uCardLightEnabled==1){
        ${basic?`vec3 lightingN;
          #ifdef FLAT_SHADED
            lightingN=normalize(cross(dFdx(-vCardStyleView),dFdy(-vCardStyleView)));
          #else
            if(dot(vCardStyleNormal,vCardStyleNormal)>.000001){lightingN=normalize(vCardStyleNormal);if(!gl_FrontFacing)lightingN=-lightingN;}else{lightingN=normalize(cross(dFdx(-vCardStyleView),dFdy(-vCardStyleView)));}
          #endif
          vec3 lightingKey=normalize((viewMatrix*vec4(uCardLightKey,0.)).xyz),lightingFill=normalize((viewMatrix*vec4(uCardLightFill,0.)).xyz),lightingRim=normalize((viewMatrix*vec4(uCardLightRim,0.)).xyz);
          float wrap=uCardLightSoftness*.65;
          float keyDiff=clamp((dot(lightingN,lightingKey)+wrap)/(1.+wrap),0.,1.);
          float fillDiff=max(dot(lightingN,lightingFill),0.);
          float facing=abs(dot(lightingN,normalize(vCardStyleView)));
          vec3 illumination=vec3(.12)+vec3(.75,.80,.88)*uCardLightFillPower*(.50+.25*fillDiff)+uCardLightKeyColor*uCardLightKeyPower*(.10+.75*keyDiff);
          gl_FragColor.rgb*=illumination;
          gl_FragColor.rgb+=uCardLightRimColor*uCardLightRimPower*.32*pow(1.-facing,2.2)*(.25+.75*max(dot(lightingN,lightingRim),0.));` : ''}
        gl_FragColor.rgb*=uCardLightExposure;
      }
      #include <tonemapping_fragment>`);};
    material.customProgramCacheKey=()=>cacheKey+'|model-lighting-v1';material.needsUpdate=true;
  }
  sync();update();return {attach,getLabel:()=>state.enabled?(presets.find(p=>p[0]===state.preset)?.[1]||'自定义打光'):'原始光照',getState:()=>({...state})};
}
