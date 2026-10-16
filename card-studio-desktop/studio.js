const invoke=(name,args,options)=>window.__TAURI__.core.invoke(name,args,options);
const desktop=await invoke('desktop_state');
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  if(url.origin===location.origin&&url.pathname.startsWith('/api/conversions')){
    try{
      let result;
      if(url.pathname==='/api/conversions')result=await invoke('create_conversion',{manifest:JSON.parse(options.body)});
      else{const [,id,action]=url.pathname.match(/^\/api\/conversions\/([^/]+)(?:\/(files|start))?$/)||[];if(!id)throw Error('转换路径无效');
        if(action==='files'){const body=new Uint8Array(await options.body.arrayBuffer());result=await invoke('upload_file',body,{headers:{'x-job-id':id,'x-resource-path':encodeURIComponent(url.searchParams.get('path'))}});}
        else if(action==='start')result=await invoke('start_conversion',{id});else result=await invoke('conversion_status',{id});
      }
      return new Response(JSON.stringify(result),{headers:{'Content-Type':'application/json'}});
    }catch(error){return new Response(JSON.stringify({error:String(error)}),{status:400,headers:{'Content-Type':'application/json'}});}
  }
  return originalFetch(input,options);
};
const status=document.createElement('div');status.id='studio-save-status';document.body.append(status);
async function saveLink(link){try{const source=link.href;if(!/^(blob:|http:\/\/tauri\.localhost\/output\/conversions\/)/.test(source))return false;const file=await originalFetch(source).then(r=>{if(!r.ok)throw Error('导出内容无法读取');return r.blob();});const token=await invoke('choose_export',{name:link.download||'character.glb'});if(!token){status.textContent='已取消保存';return true;}status.textContent='正在保存文件…';const bytes=new Uint8Array(await file.arrayBuffer());const saved=await invoke('save_export',bytes,{headers:{'x-export-id':token}});status.textContent='已保存：'+saved;setTimeout(()=>status.textContent='',8000);return true;}catch(e){status.textContent='保存失败：'+e;throw e;}}
const nativeClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download&&/^(blob:|http:\/\/tauri\.localhost\/output\/conversions\/)/.test(this.href)){void saveLink(this).catch(console.error);return;}return nativeClick.call(this);};
document.addEventListener('click',event=>{const a=event.target.closest('a[download]');if(a&&/^(blob:|http:\/\/tauri\.localhost\/output\/conversions\/)/.test(a.href)){event.preventDefault();void saveLink(a).catch(console.error);}},true);
document.querySelector('.brand').innerHTML='Ririra 闪卡工作台<small>DESKTOP CARD STUDIO</small>';
const actions=document.createElement('div');actions.className='studio-actions';actions.innerHTML='<small>桌面版 · 本机处理</small><button class="secondary" id="studio-blender">设置 Blender</button>';document.querySelector('header').append(actions);document.querySelector('.badge').remove();
actions.querySelector('button').onclick=async()=>{const value=await invoke('choose_blender');status.textContent=value?'已设置 Blender：'+value:'未修改 Blender 设置';};
window.addEventListener('error',event=>invoke('frontend_error',{message:String(event.message)}));window.addEventListener('unhandledrejection',event=>invoke('frontend_error',{message:String(event.reason)}));
await import('./realtime-viewer.js');await window.characterReady;
const {initStudioPanels}=await import('./studio-panels.js');initStudioPanels();
if(desktop.testModel){const entries=await Promise.all(desktop.testModel.map(async item=>({path:item.path,file:new File([await originalFetch(item.url).then(r=>r.blob())],item.path.split('/').pop())})));await window.studioImporter.selectFiles(entries);}
try{const view=JSON.parse(localStorage.getItem('card.studioView'));if(view){window.__card3d.setView(view.yaw,view.pitch);const zoom=document.querySelector('#zoom');zoom.value=view.zoom;zoom.dispatchEvent(new Event('input',{bubbles:true}));}}catch{}
function persistView(){const s=window.__card3d.getState();localStorage.setItem('card.studioView',JSON.stringify({yaw:s.yaw,pitch:s.pitch,zoom:s.zoom}));}
document.querySelector('#canvas').addEventListener('pointerup',persistView);document.querySelector('#canvas').addEventListener('wheel',()=>setTimeout(persistView,200),{passive:true});
if(desktop.smoke){
  const side=window.studioPanels.side,groups=window.studioPanels.groups;
  const layout={defaultCollapsed:groups.every(d=>!d.open),groupCount:groups.length,pageHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight,sideHeight:side.clientHeight,viewerHeight:document.querySelector('.viewer').clientHeight};
  const background=groups.find(d=>d.dataset.panel==='background');background.open=true;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const grid=side.querySelector('.background-grid'),image=grid.querySelector('img');
  layout.background={gridWidth:grid.clientWidth,contentWidth:grid.scrollWidth,thumbnailFit:getComputedStyle(image).objectFit,thumbnailWidth:image.clientWidth,thumbnailHeight:image.clientHeight,sideWidth:side.clientWidth};background.open=false;side.scrollTop=0;
  for(const key of ['text','lighting','export'])groups.find(g=>g.dataset.panel===key).open=true;
  for(const d of side.querySelectorAll('.studio-export-format'))d.open=true;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const textInput=side.querySelector('#card-text-title'),textLabel=side.querySelector('label[for=card-text-title]'),gifSelect=side.querySelector('#gif-size'),gifLabel=side.querySelector('label[for=gif-size]');
  layout.controlStyles={lightingColumns:getComputedStyle(side.querySelector('.lighting-presets')).gridTemplateColumns.split(' ').length,textInputHeight:textInput.clientHeight,textInputBackground:getComputedStyle(textInput).backgroundColor,textLabelAbove:textLabel.getBoundingClientRect().bottom<=textInput.getBoundingClientRect().top,gifSelectHeight:gifSelect.clientHeight,gifLabelAbove:gifLabel.getBoundingClientRect().bottom<=gifSelect.getBoundingClientRect().top,switchAppearance:getComputedStyle(side.querySelector('#lighting-enabled')).appearance};
  for(const group of groups)group.open=false;for(const d of side.querySelectorAll('.studio-export-format'))d.open=false;side.scrollTop=0;
  document.querySelector('#png-size').value='720';document.querySelector('#save').click();
  async function waitFor(test,limit=90000){const start=Date.now();while(!await test()){if(Date.now()-start>limit)throw Error('桌面导出测试超时');await new Promise(r=>setTimeout(r,100));}}
  await waitFor(async()=>await invoke('export_count')>=1);
  document.querySelector('#export-ririra').click();await waitFor(async()=>await invoke('export_count')>=2);
  document.querySelector('#gif-size').value='360';document.querySelector('#export-gif').click();await waitFor(async()=>await invoke('export_count')>=3);
  const state=window.__card3d.getState();await invoke('smoke_done',{state:{...state,layout,screenshot:document.querySelector('#canvas').toDataURL('image/png'),controls:{backgrounds:document.querySelectorAll('.background-grid button').length,frames:document.querySelectorAll('.frame-grid button').length},webgl:!!document.querySelector('#canvas').getContext('webgl2')}});
}
