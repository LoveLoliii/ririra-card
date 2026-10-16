export function initStudioPanels(){
  const side=document.querySelector('.side');
  const intro=side.querySelector('h1')?.parentElement;
  const view=[...side.children].filter(el=>el.tagName==='DIV'&&el.querySelector('#yaw,#wireframe'));
  const overview=document.createElement('div');overview.className='studio-overview';
  const bar=document.createElement('div');bar.className='studio-panel-bar';bar.innerHTML='<strong>卡片设置</strong><button type="button" aria-label="折叠全部设置">全部折叠</button>';
  overview.append(bar);if(intro){intro.classList.add('studio-card-heading');overview.append(intro);}
  const groups=[];
  function group(key,title,note,nodes){
    const section=document.createElement('details');section.className='studio-section';section.dataset.panel=key;
    const summary=document.createElement('summary');
    const name=document.createElement('strong');name.textContent=title;
    const hint=document.createElement('small');hint.textContent=note;
    summary.append(name,hint);const body=document.createElement('div');body.className='studio-section-body';
    for(const node of nodes.filter(Boolean))body.append(node);
    section.append(summary,body);groups.push(section);return section;
  }
  const panel=selector=>side.querySelector(selector);
  group('model','角色模型','导入、摆放与透明度',[panel('.import-section')]);
  group('view','观察与显示','角度、缩放与网格',view);
  group('style','渲染风格','人物材质风格',[panel('.render-styles')]);
  group('lighting','人物打光','主光、补光与轮廓光',[panel('.model-lighting')]);
  group('background','卡面背景',`${side.querySelectorAll('.background-grid button').length} 款 · 分类与搜索`,[panel('.card-backgrounds')]);
  group('frame','卡片边框',`${side.querySelectorAll('.frame-grid button').length} 款边框`,[panel('.card-frames')]);
  group('text','卡面文字','卡名、寄语与编号',[panel('.card-text')]);
  group('effects','特效图层','星闪、粒子与动态效果',[panel('.card-effects')]);
  const exports=document.createElement('div');exports.className='studio-export-options';
  for(const [title,nodes]of [ ['ririra 卡片',[panel('.ririra-export')]],['PNG 图片',[panel('.png-export'),side.querySelector('#save')]],['GIF 动图',[panel('.gif-export')]] ]){
    const details=document.createElement('details');details.className='studio-export-format';
    const summary=document.createElement('summary');summary.textContent=title;details.append(summary);
    const content=document.createElement('div');for(const node of nodes.filter(Boolean))content.append(node);details.append(content);exports.append(details);
  }
  group('export','导出文件','ririra · PNG · GIF',[exports]);
  // Keep the existing nodes and their event handlers; only move the layout containers.
  const status=side.querySelector('#status'),footer=side.querySelector('.bottom');
  side.replaceChildren(overview,...groups,...[status,footer].filter(Boolean));
  bar.querySelector('button').onclick=()=>{for(const section of groups)section.open=false;side.scrollTo({top:0,behavior:'smooth'});};
  document.body.classList.add('studio-organized');
  const gallery=side.querySelector('.background-grid'),note=document.createElement('p');note.className='background-gallery-note';note.textContent='完整卡面缩略图 · 在列表内滚动浏览';gallery.before(note);
  window.studioPanels={groups,side};
  window.dispatchEvent(new Event('resize'));
}
