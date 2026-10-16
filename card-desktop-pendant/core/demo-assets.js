import * as THREE from './vendor/three/three.module.js';

// Original procedural example: no game models or textures are distributed.
export async function createDemoAssets(){
  const scene=new THREE.Group();
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.37,0),new THREE.MeshStandardMaterial({color:0x9acbfa,metalness:.5,roughness:.23}));
  crystal.scale.set(.72,1.75,.72);crystal.position.y=.08;crystal.rotation.set(.08,.4,.12);scene.add(crystal);
  for(let i=0;i<3;i++){
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.48+i*.035,.008,8,100),new THREE.MeshStandardMaterial({color:i===1?0xe9b5b8:0xa8c7ee,metalness:.7,roughness:.3}));
    ring.rotation.set(Math.PI/2+(i-1)*.5,.35+(i-1)*.7,0);ring.position.y=.08;scene.add(ring);
  }
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2,c=new THREE.Mesh(new THREE.OctahedronGeometry(.035+i%3*.012),new THREE.MeshStandardMaterial({color:i%2?0xe4b7c8:0xb4d9f2,metalness:.45,roughness:.25}));
    c.position.set(Math.cos(a)*.46,Math.sin(a)*.6+.08,Math.sin(a*2)*.12);scene.add(c);
  }
  async function texture(paint){const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1536;paint(canvas.getContext('2d'));const image=new Image();image.src=canvas.toDataURL();await image.decode();const t=new THREE.Texture(image);t.colorSpace=THREE.SRGBColorSpace;t.needsUpdate=true;return t;}
  const bg=await texture(x=>{
    const g=x.createRadialGradient(512,700,0,512,768,1000);g.addColorStop(0,'#302947');g.addColorStop(1,'#101222');x.fillStyle=g;x.fillRect(0,0,1024,1536);
    for(const r of [310,325,385]){x.strokeStyle='#b5a1cb45';x.lineWidth=1.5;x.beginPath();x.arc(512,750,r,0,Math.PI*2);x.stroke();}
    for(let i=0;i<60;i++){const px=80+(i*137.3)%864,py=240+(i*193.7)%1020;x.fillStyle=i%3?'#d2b6cd65':'#a9c6e480';x.beginPath();x.arc(px,py,1+i%3,0,Math.PI*2);x.fill();}
  });
  const petals=await texture(()=>{});return {scene,bg,petals};
}
