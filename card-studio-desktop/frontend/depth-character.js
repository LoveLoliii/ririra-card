/* Single-view relief mesh. This approximates depth; it is not a recovered full model. */
window.createDepthCharacter = async function (canvas, source) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('WebGL unavailable');
  const compile = (type, code) => { const shader = gl.createShader(type); gl.shaderSource(shader, code); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader)); return shader; };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, `
    attribute vec3 position; attribute vec3 normal; attribute vec2 uv;
    uniform float angle; uniform float pitch; uniform float strength;
    varying vec2 texUV; varying vec3 surfaceNormal;
    void main(){
      float c=cos(angle),s=sin(angle),cp=cos(pitch),sp=sin(pitch);
      vec3 p=position; p.z*=strength;
      mat3 ry=mat3(c,0.,-s, 0.,1.,0., s,0.,c);
      mat3 rx=mat3(1.,0.,0., 0.,cp,sp, 0.,-sp,cp);
      p=rx*ry*p;
      float persp=1000./(1000.-p.z);
      gl_Position=vec4(p.x*persp/300.,p.y*persp/325.,-p.z/500.,1.);
      texUV=uv;
      surfaceNormal=rx*ry*normalize(vec3(normal.xy*strength,normal.z));
    }`));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform sampler2D portrait; uniform float lightMotion;
    varying vec2 texUV; varying vec3 surfaceNormal;
    void main(){
      vec4 col=texture2D(portrait,texUV);if(col.a<0.08)discard;
      vec3 n=normalize(surfaceNormal),l=normalize(vec3(-.5+lightMotion*.6,.5,1.3));
      float diffuse=max(dot(n,l),0.);
      float rim=pow(1.-max(n.z,0.),2.5);
      vec3 rgb=col.rgb*(.77+.29*diffuse)+vec3(.17,.10,.18)*rim;
      gl_FragColor=vec4(rgb,col.a);
    }`));
  gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  // Elliptical volumes: hair/head, face/nose, torso, skirt, raised hands and legs.
  // Coordinates measured against the supplied transparent cutout.
  const parts=[
    [.50,.125,.21,.16,32], [.505,.164,.155,.12,48],
    [.49,.34,.23,.19,42], [.49,.442,.21,.12,30], [.51,.64,.43,.24,52],
    [.355,.227,.115,.115,58], [.635,.226,.115,.115,63],
    [.267,.328,.12,.13,38],[.718,.326,.12,.13,40],
    [.417,.845,.13,.15,37],[.613,.864,.13,.16,42],
    [.408,.925,.10,.11,30],[.638,.955,.10,.11,35]
  ];
  function depth(u,v){let sum=0;for(const [cx,cy,rx,ry,height] of parts){const d=((u-cx)/rx)**2+((v-cy)/ry)**2;sum+=Math.pow(height*Math.exp(-d*1.6),6);}return 8+Math.pow(sum,1/6);}
  const nx=180,ny=240,vertices=[],normals=[],uvs=[],indices=[];
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const u=i/nx,v=j/ny,z=depth(u,v);
    vertices.push((u-.5)*404,(.5-v)*539,z);
    const dx=(depth(u+.002,v)-depth(u-.002,v))/(.004*404),dy=(depth(u,v+.002)-depth(u,v-.002))/(.004*539);
    const length=Math.hypot(dx,dy,1);normals.push(-dx/length,dy/length,1/length);uvs.push(u,v);
    if(i<nx&&j<ny){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  function attribute(name,size,data){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);const l=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,size,gl.FLOAT,false,0,0);}
  attribute('position',3,vertices);attribute('normal',3,normals);attribute('uv',2,uvs);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  const image=new Image();image.src=source;await image.decode();
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const locations=Object.fromEntries(['angle','pitch','strength','lightMotion'].map(k=>[k,gl.getUniformLocation(program,k)]));
  return (t,strength=1)=>{
    const a=t*Math.PI*2;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(locations.angle,Math.sin(a)*.24);gl.uniform1f(locations.pitch,Math.cos(a)*.035);gl.uniform1f(locations.strength,strength);gl.uniform1f(locations.lightMotion,Math.sin(a));gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
    if(gl.getError()!==gl.NO_ERROR)throw new Error('WebGL draw failed');
  };
};
