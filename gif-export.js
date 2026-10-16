export function initGifExport({canStart,beginCapture,captureFrame,endCapture,fileName,loopDuration=()=>2400}){
  const section=document.createElement('section');section.className='gif-export';section.setAttribute('aria-label','GIF 导出');
  section.innerHTML='<div class="section-label">GIF 导出</div><label for="gif-size">图片大小</label><select id="gif-size"><option value="360">群聊版 · 360 × 540</option><option value="480">清晰版 · 480 × 720</option></select><label for="gif-swing">转动幅度</label><select id="gif-swing"><option value="8">轻微 · 左右 8°</option><option value="14">明显 · 左右 14°</option></select><p class="gif-help">围绕当前视角轻摆，包含当前模型、背景、文字与渲染风格。默认循环 2.4 秒，时长随特效速度调整。高清版文件更大、编码更慢；GIF 最多 256 色。</p><button id="export-gif" class="primary" type="button">导出当前卡面 GIF</button><button id="cancel-gif" class="secondary" type="button" hidden>取消导出</button><progress id="gif-progress" max="100" value="0" hidden aria-label="GIF 导出进度"></progress><p id="gif-message" role="status"></p><a id="gif-download" hidden>再次下载 GIF</a>';
  const css=document.createElement('style');css.textContent='.gif-export{padding-top:14px;border-top:1px solid var(--line)}.gif-export label{display:block;color:#bca8b8;font-size:11px;margin:8px 0 5px}.gif-export select{width:100%;background:#211c29;color:#edd8ce;border:1px solid #ffffff24;border-radius:5px;padding:7px;font:inherit;font-size:11px}.gif-help,#gif-message{color:#bca8b8;font-size:11px;line-height:1.8;margin:10px 0}.gif-export button{width:100%;margin-top:6px}.gif-export progress{width:100%;height:7px;margin-top:12px;accent-color:#ddb6aa}.gif-export [hidden]{display:none}#gif-download{color:#e5c1af;font-size:12px}';document.head.append(css);
  document.querySelector('#save').after(section);
  const button=section.querySelector('#export-gif'),cancel=section.querySelector('#cancel-gif'),progress=section.querySelector('progress'),message=section.querySelector('#gif-message'),download=section.querySelector('#gif-download');
  const sizeSelect=section.querySelector('#gif-size');
  for(const [value,label]of [['720','高清版 · 720 × 1080'],['960','超清版 · 960 × 1440'],['1080','收藏版 · 1080 × 1620']]){const option=document.createElement('option');option.value=value;option.textContent=label;sizeSelect.append(option);}
  try{const saved=localStorage.getItem('card.gifSize');if([...sizeSelect.options].some(o=>o.value===saved))sizeSelect.value=saved;}catch{}sizeSelect.onchange=()=>{try{localStorage.setItem('card.gifSize',sizeSelect.value);}catch{}};
  let busy=false,abort=false,worker,url,rejectEncoding;
  cancel.onclick=()=>{abort=true;worker?.terminate();rejectEncoding?.(new DOMException('已取消','AbortError'));};
  button.onclick=async()=>{
    if(busy)return;if(!canStart()){message.textContent='请等待模型准备完成后再导出。';return;}
    const width=Number(section.querySelector('#gif-size').value),height=width*1.5,amplitude=Number(section.querySelector('#gif-swing').value),total=48;
    busy=true;abort=false;download.hidden=true;progress.hidden=false;progress.value=0;cancel.hidden=false;
    const locked=[...document.querySelectorAll('.side button,.side input,.side select,.side textarea')].filter(el=>el!==cancel).map(el=>[el,el.disabled]);locked.forEach(([el])=>el.disabled=true);
    let session;
    try{
      worker=new Worker(new URL('./gif-worker.js',import.meta.url),{type:'module'});
      let workerError,resolveMessage;worker.onerror=e=>{workerError=Error(e.message||'GIF 编码器无法启动');rejectEncoding?.(workerError);};
      worker.onmessage=({data})=>{if(data.type==='error'){workerError=Error(data.message);rejectEncoding?.(workerError);}else{const resolve=resolveMessage;resolveMessage=null;rejectEncoding=null;resolve?.(data);}};
      const request=(data,transfer=[])=>{if(abort)return Promise.reject(new DOMException('已取消','AbortError'));if(workerError)return Promise.reject(workerError);return new Promise((resolve,reject)=>{resolveMessage=resolve;rejectEncoding=reject;worker.postMessage(data,transfer);});};
      session=beginCapture(192,288);const outputName=fileName();
      // Sample the complete loop once, then stream large frames through the worker.
      // This retains a single global palette without storing 48 full-size RGBA frames.
      for(let i=0;i<12;i++){
        if(abort)throw new DOMException('已取消','AbortError');if(workerError)throw workerError;
        const phase=i/12*Math.PI*2,frame=captureFrame(session,amplitude*Math.sin(phase),2*(Math.cos(phase)-1),i/12);
        worker.postMessage({type:'sample',buffer:frame.buffer},[frame.buffer]);progress.value=Math.round((i+1)/12*12);message.textContent=`正在采样动画配色 ${i+1} / 12`;await new Promise(requestAnimationFrame);
      }
      endCapture(session);session=undefined;session=beginCapture(width,height);message.textContent='正在生成统一调色板…';await request({type:'prepare'});
      const duration=loopDuration(),delays=Array.from({length:total},(_,i)=>Math.round((i+1)*duration/total/10)*10-Math.round(i*duration/total/10)*10);
      for(let i=0;i<total;i++){
        if(abort)throw new DOMException('已取消','AbortError');if(workerError)throw workerError;
        const phase=i/total*Math.PI*2,frame=captureFrame(session,amplitude*Math.sin(phase),2*(Math.cos(phase)-1),i/total);
        await request({type:'frame',buffer:frame.buffer,width,height,delay:delays[i]},[frame.buffer]);progress.value=15+Math.round((i+1)/total*80);message.textContent=`正在渲染并编码 ${i+1} / ${total}`;
        await new Promise(requestAnimationFrame);
      }
      if(workerError)throw workerError;
      message.textContent='正在完成 GIF…';const result=await request({type:'finish'}),bytes=result.buffer;
      if(abort)throw new DOMException('已取消','AbortError');
      const blob=new Blob([bytes],{type:'image/gif'});if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(blob);download.href=url;download.download=`${outputName}-${width}x${height}.gif`;download.hidden=false;download.click();progress.value=100;message.textContent=`已导出 ${width} × ${height} · ${(blob.size/1024/1024).toFixed(2)} MB`;
    }catch(error){message.textContent=error.name==='AbortError'?'已取消导出，当前视角已保留。':'导出失败：'+(error.message||'请重试');}
    finally{worker?.terminate();worker=null;rejectEncoding=null;try{if(session)endCapture(session);}finally{locked.forEach(([el,disabled])=>el.disabled=disabled);cancel.hidden=true;progress.hidden=true;download.hidden=!url;busy=false;}}
  };
}
