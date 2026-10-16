import { GIFEncoder, quantize, applyPalette } from './vendor/gifenc/gifenc.esm.js';

let samples=[],palette,gif,index=0;
self.onmessage=({data})=>{try{
  if(data.type==='sample'){samples.push(new Uint8Array(data.buffer));return;}
  if(data.type==='prepare'){
    const pixels=new Uint8Array(samples.reduce((n,s)=>n+s.length,0));let offset=0;for(const sample of samples){pixels.set(sample,offset);offset+=sample.length;}samples=[];
    palette=quantize(pixels,256,{format:'rgb565'});gif=GIFEncoder();index=0;self.postMessage({type:'ready'});return;
  }
  if(data.type==='frame'){
    const frame=new Uint8Array(data.buffer),mapped=applyPalette(frame,palette,'rgb565');gif.writeFrame(mapped,data.width,data.height,{palette:index===0?palette:undefined,delay:data.delay,repeat:0,dispose:1});index++;self.postMessage({type:'frame-done',index});return;
  }
  if(data.type==='finish'){gif.finish();const bytes=gif.bytes();self.postMessage({type:'done',buffer:bytes.buffer},[bytes.buffer]);gif=null;palette=null;}
}catch(error){self.postMessage({type:'error',message:error.message||'GIF 编码失败'});}};
