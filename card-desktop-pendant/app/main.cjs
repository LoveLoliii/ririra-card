const {app,BrowserWindow,Tray,Menu,nativeImage,ipcMain,globalShortcut,screen,session,dialog}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {createServer}=require('./server.cjs');
const {readSettings,writeSettings,fitBounds,safeCardState}=require('./settings.cjs');
const {saveModel,clearModel}=require('./model-store.cjs');
const {readActiveCard,importCard}=require('./card-store.cjs');
const {createStartup}=require('./startup.cjs');
const smoke=process.argv.includes('--smoke-test'),project=path.resolve(__dirname,'..');
if(smoke)app.setPath('userData',path.join(project,'output/smoke-profile'));
app.setName('Ririra Card Pendant');
if(!app.requestSingleInstanceLock()){app.quit();}else{
  let widget,editor,tray,serverInfo,settings,settingsFile,quitting=false,saveTimer,moveTimer,smokeTimer,importing=false;
  const log=(name,value)=>console.log(JSON.stringify({event:name,...value}));
  const startup=createStartup(app);
  function saveWindowState(){if(!settings||!settingsFile)return;clearTimeout(saveTimer);if(widget&&!widget.isDestroyed())settings.bounds=widget.getBounds();writeSettings(settingsFile,settings);}
  function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>writeSettings(settingsFile,settings),180);}
  function safeSender(event){if(![widget?.webContents.id,editor?.webContents.id].includes(event.sender.id))throw Error('Unknown window');if(!event.sender.getURL().startsWith(serverInfo.url+'/'))throw Error('Unknown origin');}
  function post(win,action){if(win&&!win.isDestroyed())win.webContents.send('pendant:action',action);}
  function currentArea(){return screen.getDisplayMatching(widget?.getBounds()||screen.getPrimaryDisplay().workArea).workArea;}
  // Compensate Windows DPI rounding, including the extra pixels on initial creation.
  function applyBounds(bounds){const requested={...bounds};for(let i=0;i<3;i++){widget.setBounds(requested);const actual=widget.getBounds();if(actual.width===bounds.width&&actual.height===bounds.height)break;requested.width+=bounds.width-actual.width;requested.height+=bounds.height-actual.height;}}
  function stopMove(){const moving=!!moveTimer;clearInterval(moveTimer);moveTimer=null;if(moving)saveWindowState();}
  function setAutoStart(value){try{settings.autoStart=startup.setEnabled(value);saveWindowState();}catch(error){dialog.showErrorBox('开机启动设置失败',error.message);}updateTray();}
  function setLocked(value){settings.locked=!!value;widget.setIgnoreMouseEvents(settings.locked,{forward:true});post(widget,{type:'lock',value:settings.locked});saveSoon();updateTray();}
  function showWidget(){settings.visible=true;widget.show();if(!settings.locked)widget.focus();updateTray();saveSoon();}
  function hideWidget(){settings.visible=false;widget.hide();updateTray();saveSoon();}
  function resizeWidget(width){const b=widget.getBounds();applyBounds(fitBounds({...b,width,height:Math.round(width*1.5)},currentArea()));settings.bounds=widget.getBounds();saveWindowState();}
  function menu(){return Menu.buildFromTemplate([
    {label:'Ririra · 桌面闪卡',enabled:false},
    {label:'导入ririra卡片',click:()=>openCard()},
    {label:settings.visible?'隐藏挂件':'显示挂件',click:()=>settings.visible?hideWidget():showWidget()},
    {type:'separator'},
    {label:'始终置顶',type:'checkbox',checked:settings.alwaysOnTop,click:item=>{settings.alwaysOnTop=item.checked;widget.setAlwaysOnTop(item.checked);saveSoon();updateTray();}},
    {label:'开机自动启动',type:'checkbox',checked:settings.autoStart,enabled:startup.supported&&!smoke,click:item=>setAutoStart(item.checked)},
    {label:'锁定并穿透鼠标',type:'checkbox',checked:settings.locked,click:item=>setLocked(item.checked)},
    {label:'挂件大小',submenu:[{label:'小 · 260 × 390',click:()=>resizeWidget(260)},{label:'中 · 340 × 510',click:()=>resizeWidget(340)},{label:'大 · 440 × 660',click:()=>resizeWidget(440)}]},
    {label:'恢复正面',click:()=>post(widget,{type:'reset'})},
    {label:'播放 / 暂停特效',click:()=>post(widget,{type:'effects'})},
    {type:'separator'},
    {label:'解锁快捷键：Ctrl + Alt + C',enabled:false},
    {label:'退出挂件',click:()=>{quitting=true;app.quit();}}
  ]);}
  function updateTray(){tray?.setContextMenu(menu());tray?.setToolTip(`Ririra 桌面闪卡${settings.locked?' · 已锁定':''}`);}
  function secureWindow(win){win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(serverInfo.url+'/'))event.preventDefault();});win.webContents.on('render-process-gone',(_,details)=>log('renderer-gone',details));}
  function openEditor(){
    if(editor&&!editor.isDestroyed()){editor.show();editor.focus();return;}
    editor=new BrowserWindow({width:1180,height:850,minWidth:800,minHeight:600,title:'闪卡工作台 · 修改后自动同步',backgroundColor:'#100e17',icon:path.join(project,'assets/icon.png'),show:!smoke,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:!smoke}});
    editor.setMenuBarVisibility(false);secureWindow(editor);editor.loadURL(serverInfo.url+'/index.html?mode=editor');editor.on('closed',()=>{editor=null;});
  }
  async function openCard(source){
    if(importing)return;importing=true;
    try{
      if(!source){const result=await dialog.showOpenDialog(widget,{title:'导入ririra卡片',properties:['openFile'],filters:[{name:'Ririra 卡片',extensions:['ririra']}]});if(result.canceled)return;source=result.filePaths[0];}
      post(widget,{type:'import-status',message:'正在读取卡片与校验资源…'});
      const card=await importCard(app.getPath('userData'),source);settings.card=safeCardState(card.manifest.settings);settings.cardId=card.id;writeSettings(settingsFile,settings);
      setLocked(false);showWidget();post(widget,{type:'refresh'});if(editor)post(editor,{type:'refresh'});tray.setToolTip(('Ririra · '+card.manifest.title).slice(0,100));
      log('card-imported',{title:card.manifest.title,id:card.id});return true;
    }catch(error){post(widget,{type:'import-status',message:'卡片导入未完成，请重试'});if(smoke)throw error;dialog.showErrorBox('卡片导入失败',error.message);return false;}finally{importing=false;}
  }
  app.on('second-instance',(_,argv)=>{const card=argv.find(value=>value.toLowerCase().endsWith('.ririra'));if(widget){if(card)openCard(card);else showWidget();}});
  app.whenReady().then(async()=>{
    const dataDir=app.getPath('userData');settingsFile=path.join(dataDir,'settings.json');settings=readSettings(settingsFile);if(settings.blenderPath)process.env.BLENDER_PATH=settings.blenderPath;
    // Reading the OS setting never registers or enables a login item on first launch.
    settings.autoStart=!smoke&&startup.isEnabled();
    session.defaultSession.setPermissionRequestHandler((_,__,callback)=>callback(false));
    const startupCard=process.argv.find(value=>value.toLowerCase().endsWith('.ririra'));
    if(startupCard){const card=await importCard(dataDir,startupCard);settings.card=safeCardState(card.manifest.settings);settings.cardId=card.id;writeSettings(settingsFile,settings);}
    const activeCard=await readActiveCard(dataDir);if(activeCard){settings.card={...activeCard.manifest.settings,...(settings.cardId===activeCard.id?settings.card:{})};settings.cardId=activeCard.id;}
    serverInfo=await createServer({project,dataDir,port:0});
    const initialBounds=fitBounds(settings.bounds,screen.getDisplayMatching(settings.bounds||screen.getPrimaryDisplay().workArea).workArea);
    widget=new BrowserWindow({...initialBounds,title:'Ririra · 桌面闪卡',transparent:true,frame:false,resizable:false,hasShadow:false,skipTaskbar:true,alwaysOnTop:settings.alwaysOnTop,backgroundColor:'#00000000',show:false,icon:path.join(project,'assets/icon.png'),webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:!smoke}});
    applyBounds(initialBounds);settings.bounds=widget.getBounds();
    widget.setMenu(null);secureWindow(widget);widget.once('ready-to-show',()=>{if(!smoke&&settings.visible)widget.showInactive();});
    widget.on('move',()=>{settings.bounds=widget.getBounds();saveSoon();});widget.on('resize',()=>{settings.bounds=widget.getBounds();saveSoon();});
    widget.on('moved',saveWindowState);widget.on('resized',saveWindowState);
    widget.on('query-session-end',saveWindowState);widget.on('session-end',saveWindowState);
    widget.on('close',event=>{if(!quitting){event.preventDefault();hideWidget();}});widget.on('blur',stopMove);
    tray=new Tray(nativeImage.createFromPath(path.join(project,'assets/tray.png')));tray.on('double-click',()=>{setLocked(false);showWidget();});updateTray();
    globalShortcut.register('CommandOrControl+Alt+C',()=>{setLocked(false);showWidget();});
    ipcMain.handle('pendant:state',event=>{safeSender(event);return {card:settings.card,locked:settings.locked,alwaysOnTop:settings.alwaysOnTop,native:serverInfo.native};});
    ipcMain.handle('pendant:card',(event,value)=>{safeSender(event);const next=safeCardState(value);if(JSON.stringify(next)!==JSON.stringify(settings.card)){settings.card=next;saveSoon();if(event.sender.id===editor?.webContents.id)post(widget,{type:'refresh'});}return true;});
    ipcMain.on('pendant:import-card',event=>{safeSender(event);openCard();});
    ipcMain.handle('pendant:import-card-file',(event,file)=>{safeSender(event);return openCard(file);});
    ipcMain.handle('pendant:model',async(event,entries)=>{safeSender(event);await saveModel(dataDir,entries);if(event.sender.id===editor?.webContents.id)post(widget,{type:'refresh'});return true;});
    ipcMain.handle('pendant:clear-model',async event=>{safeSender(event);await clearModel(dataDir);if(event.sender.id===editor?.webContents.id)post(widget,{type:'refresh'});return true;});
    for(const [channel,action]of [['editor',openEditor],['menu',()=>menu().popup({window:widget})],['hide',hideWidget],['lock',()=>setLocked(!settings.locked)],['move-end',stopMove]])ipcMain.on('pendant:'+channel,event=>{safeSender(event);action();});
    ipcMain.on('pendant:move-start',event=>{safeSender(event);if(settings.locked)return;stopMove();const start=screen.getCursorScreenPoint(),b=widget.getBounds();moveTimer=setInterval(()=>{const p=screen.getCursorScreenPoint();widget.setPosition(b.x+p.x-start.x,b.y+p.y-start.y);},16);});
    ipcMain.on('pendant:ready',async(event,state)=>{
      safeSender(event);if(event.sender.id!==widget.webContents.id)return;
      log('pendant-ready',{native:serverInfo.native,meshCount:state.meshCount,transparent:true,alwaysOnTop:widget.isAlwaysOnTop(),url:serverInfo.url});
      if(smoke){
        try{const dir=path.join(project,'output');fs.mkdirSync(dir,{recursive:true});const image=await widget.webContents.capturePage();fs.writeFileSync(path.join(dir,serverInfo.native?'smoke-window.png':'smoke-demo.png'),image.toPNG());fs.writeFileSync(path.join(dir,serverInfo.native?'smoke-result.json':'smoke-demo-result.json'),JSON.stringify({ready:state.ready,meshCount:state.meshCount,native:serverInfo.native,transparent:image.toBitmap()[3]===0,bounds:widget.getBounds(),alwaysOnTop:widget.isAlwaysOnTop()},null,2));quitting=true;clearTimeout(smokeTimer);app.quit();}catch(error){console.error(error);quitting=true;app.exit(1);}
      }else if(settings.visible)widget.showInactive();
    });
    widget.loadURL(serverInfo.url+'/index.html?mode=pendant');
    if(smoke)smokeTimer=setTimeout(()=>{console.error('Desktop smoke test timed out');quitting=true;app.exit(1);},90000);
    log('started',{url:serverInfo.url,native:serverInfo.native,dataDir,bounds:widget.getBounds(),autoStart:settings.autoStart});
  }).catch(error=>{console.error(error);app.exit(1);});
  app.on('before-quit',()=>{quitting=true;stopMove();saveWindowState();globalShortcut.unregisterAll();serverInfo?.server.close();tray?.destroy();});
  app.on('window-all-closed',()=>{});
}
