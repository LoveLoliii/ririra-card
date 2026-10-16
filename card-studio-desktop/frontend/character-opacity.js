import * as THREE from './vendor/three/three.module.js';

export function createCharacterOpacity({renderer,scene,camera,onChange}){
  let transparency=0,target;
  try{const saved=localStorage.getItem('card.characterTransparency');if(saved!==null&&Number.isFinite(Number(saved)))transparency=THREE.MathUtils.clamp(Number(saved),0,100);}catch{}
  const panel=document.createElement('div');panel.className='range-block character-opacity';
  panel.innerHTML='<label class="range-label" for="character-transparency">人物透明度<output id="character-transparency-value"></output></label><input id="character-transparency" type="range" min="0" max="100" step="1"><p class="import-help">0% 完全显示 · 100% 隐藏人物</p>';
  document.querySelector('.import-section #placement').before(panel);
  const slider=panel.querySelector('input'),output=panel.querySelector('output');slider.value=transparency;
  function update(){output.value=`${transparency}%`;try{localStorage.setItem('card.characterTransparency',String(transparency));}catch{}onChange?.(transparency);}
  slider.oninput=()=>{transparency=Number(slider.value);update();};
  const composite=new THREE.Scene(),screenCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const material=new THREE.ShaderMaterial({
    uniforms:{layer:{value:null},opacity:{value:1}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader:`uniform sampler2D layer;uniform float opacity;varying vec2 vUv;
      void main(){vec4 pixel=texture2D(layer,vUv);if(pixel.a<=0.00001)discard;
        gl_FragColor=vec4(pixel.rgb/pixel.a,pixel.a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        gl_FragColor.rgb*=gl_FragColor.a;
        gl_FragColor*=opacity;
      }`,
    transparent:true,depthTest:false,depthWrite:false,blending:THREE.CustomBlending,
    blendEquation:THREE.AddEquation,blendSrc:THREE.OneFactor,blendDst:THREE.OneMinusSrcAlphaFactor
  });
  const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);quad.frustumCulled=false;composite.add(quad);
  const size=new THREE.Vector2();
  function render(){
    if(transparency>=100)return;
    if(transparency<=0){renderer.render(scene,camera);return;}
    const previous=renderer.getRenderTarget();if(previous)size.set(previous.width,previous.height);else renderer.getDrawingBufferSize(size);
    if(!target||target.width!==size.x||target.height!==size.y){target?.dispose();target=new THREE.WebGLRenderTarget(size.x,size.y,{type:THREE.HalfFloatType,depthBuffer:true});target.samples=Math.min(4,renderer.capabilities.maxSamples);}
    try{renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);}finally{renderer.setRenderTarget(previous);}
    material.uniforms.layer.value=target.texture;material.uniforms.opacity.value=1-transparency/100;renderer.render(composite,screenCamera);
  }
  update();return {render,getValue:()=>transparency};
}
