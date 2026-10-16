const bridge=window.desktopPendant,mode=new URLSearchParams(location.search).get('mode')||'pendant';
document.body.dataset.pendant=mode==='pendant'?'true':'false';
const desktopState=bridge?await bridge.getState():null;
if(desktopState){for(const key of Object.keys(localStorage))if(key.startsWith('card.'))localStorage.removeItem(key);for(const [key,value]of Object.entries(desktopState.card))localStorage.setItem(key,value);}
const toolbar=document.createElement('div');toolbar.className='pendant-toolbar';toolbar.setAttribute('aria-label','挂件工具栏');
toolbar.innerHTML='<span class="pendant-grip" title="拖动这里移动挂件">⠿</span><button data-pendant-action="import" title="导入ririra卡片" aria-label="导入ririra卡片">＋</button><button data-pendant-action="reset" title="恢复正面" aria-label="恢复正面">↺</button><button data-pendant-action="lock" title="锁定并穿透鼠标；Ctrl+Alt+C 解锁" aria-label="锁定挂件">◇</button><button data-pendant-action="menu" title="挂件菜单" aria-label="挂件菜单">⋯</button>';
document.body.append(toolbar);
const hint=document.createElement('div');hint.className='pendant-tip';hint.textContent='拖动旋转 · ＋导入卡片 · Alt+拖动移动';document.body.append(hint);
if(mode==='editor'){const note=document.createElement('div');note.className='pendant-editor-note';note.textContent='桌面挂件工作台 · 修改会自动同步，关闭此窗口后挂件仍然保留';document.querySelector('header').after(note);}
let starting=true,syncTimer,refreshTimer;
function snapshot(){const state={};for(const key of Object.keys(localStorage).sort())if(key.startsWith('card.'))state[key]=localStorage.getItem(key);return state;}
function persist(){if(starting||!bridge)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>bridge.saveCard(snapshot()).catch(console.error),300);}
function preserveView(){if(!window.__card3d?.state.ready)return;const v=window.__card3d.getState();localStorage.setItem('card.desktopView',JSON.stringify({yaw:v.yaw,pitch:v.pitch,zoom:v.zoom}));persist();}
document.addEventListener('input',persist);document.addEventListener('change',persist);document.addEventListener('click',persist);
await import('../core/realtime-viewer.js');
const ready=await window.characterReady;
if(ready){
  // Packaged models are loaded by createBuiltinAssets; B needs no A installation.
  try{const placement=JSON.parse(localStorage.getItem('card.desktopPlacement'));if(placement)for(const [id,value]of Object.entries(placement)){const input=document.getElementById(id);if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}}}catch{}
  try{const view=JSON.parse(localStorage.getItem('card.desktopView'));if(view){window.__card3d.setView(view.yaw,view.pitch);const zoom=document.querySelector('#zoom');zoom.value=view.zoom;zoom.dispatchEvent(new Event('input',{bubbles:true}));}}catch{}
}
starting=false;
document.querySelector('#placement').addEventListener('input',()=>{const placement={};for(const el of document.querySelectorAll('#placement input'))placement[el.id]=el.value;localStorage.setItem('card.desktopPlacement',JSON.stringify(placement));persist();});
document.querySelector('#canvas').addEventListener('pointerup',preserveView);document.querySelector('#canvas').addEventListener('wheel',()=>{clearTimeout(syncTimer);syncTimer=setTimeout(preserveView,250);},{passive:true});
toolbar.addEventListener('click',event=>{const action=event.target.closest('[data-pendant-action]')?.dataset.pendantAction;if(action==='import'){if(bridge)bridge.importCard();else{hint.textContent='请在桌面应用 B 中导入 .ririra 文件';}}if(action==='reset'){window.__card3d.reset();preserveView();}if(action==='lock')bridge?.toggleLock();if(action==='menu')bridge?.showMenu();});
document.querySelector('#canvas').addEventListener('dblclick',()=>{window.__card3d.reset();preserveView();});
if(mode==='pendant'){
  const canvas=document.querySelector('#canvas');
  document.addEventListener('drop',async event=>{event.preventDefault();event.stopImmediatePropagation();document.querySelector('.viewer').classList.remove('drop-active');const file=event.dataTransfer?.files?.[0];if(file&&/\.ririra$/i.test(file.name)&&bridge){hint.textContent='正在导入卡片…';await bridge.importCardFile(file);}else hint.textContent='请拖入 A 导出的 .ririra 卡片';},true);
  canvas.addEventListener('contextmenu',event=>{event.preventDefault();bridge?.showMenu();});
  canvas.addEventListener('pointerdown',event=>{if(event.button===2){event.stopImmediatePropagation();return;}if(event.altKey&&bridge){event.preventDefault();event.stopImmediatePropagation();canvas.setPointerCapture(event.pointerId);bridge.beginMove();}},true);
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>bridge?.endMove());
}
bridge?.onAction(action=>{
  if(action.type==='import-status')hint.textContent=action.message;
  if(action.type==='refresh'){clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>location.reload(),450);}
  if(action.type==='reset'){window.__card3d.reset();preserveView();}
  if(action.type==='effects'){const input=document.querySelector('#effect-playing');input.checked=!input.checked;input.dispatchEvent(new Event('change',{bubbles:true}));persist();}
  if(action.type==='lock')document.body.dataset.locked=String(action.value);
});
document.body.dataset.locked=String(desktopState?.locked||false);
persist();if(ready){await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));bridge?.reportReady(window.__card3d.getState());}
