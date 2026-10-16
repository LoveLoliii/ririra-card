import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { createDemoAssets } from './demo-assets.js';
export async function createBuiltinAssets(){
  const active=await fetch('/api/active-card').then(r=>r.json());
  if(active){
    const base='/card-assets/'+active.id+'/';
    const texture=url=>new Promise((resolve,reject)=>new THREE.TextureLoader().load(url,t=>{t.colorSpace=THREE.SRGBColorSpace;resolve(t);},undefined,reject));
    const [gltf,bg,petals]=await Promise.all([new GLTFLoader().loadAsync(base+'model.glb'),texture(base+'background.png'),texture(base+'foreground.png')]);
    return {scene:gltf.scene,bg,petals,native:false,prepared:true,modelName:active.manifest.model.name,bundleView:active.manifest.view};
  }
  return {...await createDemoAssets(),native:false,modelName:'原创水晶示例'};
}
