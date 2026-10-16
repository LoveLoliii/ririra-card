import {createRirira} from './ririra-format/format.js';
export function initRiriraExport({canStart,capture,fileName}){
  const panel=document.createElement('section');panel.className='ririra-export';panel.setAttribute('aria-label','Ririra 卡片导出');
  panel.innerHTML='<div class="section-label">桌面卡片</div><p>将模型、卡面和观察角度打包为一个文件，供桌面挂件导入。</p><button type="button" class="primary" id="export-ririra">导出 .ririra 卡片</button><p id="ririra-message" role="status"></p>';
  const css=document.createElement('style');css.textContent='.ririra-export{padding-top:14px;border-top:1px solid var(--line)}.ririra-export p{font-size:11px;color:#bca8b8;line-height:1.8;margin:8px 0}.ririra-export button{width:100%}#ririra-message{color:#e2c8be}';document.head.append(css);(document.querySelector('.png-export')||document.querySelector('#save')).before(panel);
  const button=panel.querySelector('button'),message=panel.querySelector('[role=status]');let busy=false;
  button.onclick=async()=>{
    if(busy)return;if(!canStart()){message.textContent='请等待模型载入完成。';return;}busy=true;
    const locked=[...document.querySelectorAll('.side button,.side input,.side select,.side textarea')].map(el=>[el,el.disabled]);locked.forEach(([el])=>el.disabled=true);
    try{message.textContent='正在打包三维模型与贴图…';await new Promise(requestAnimationFrame);const snapshot=await capture();message.textContent='正在生成卡片并校验资源…';const blob=await createRirira(snapshot);const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=(fileName()||'我的卡片').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,80)+'.ririra';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);message.textContent=`已导出 .ririra · ${(blob.size/1048576).toFixed(2)} MB，可在桌面挂件中导入。`;}
    catch(error){console.error(error);message.textContent='导出失败：'+error.message;}
    finally{locked.forEach(([el,disabled])=>el.disabled=disabled);busy=false;}
  };
}
