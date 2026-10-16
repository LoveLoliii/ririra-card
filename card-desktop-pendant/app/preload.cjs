const {contextBridge,ipcRenderer,webUtils}=require('electron');
contextBridge.exposeInMainWorld('desktopPendant',{
  getState:()=>ipcRenderer.invoke('pendant:state'),
  importCard:()=>ipcRenderer.send('pendant:import-card'),
  importCardFile:file=>ipcRenderer.invoke('pendant:import-card-file',webUtils.getPathForFile(file)),
  saveCard:state=>ipcRenderer.invoke('pendant:card',state),
  rememberFiles:entries=>ipcRenderer.invoke('pendant:model',entries.map(e=>({path:e.path,source:webUtils.getPathForFile(e.file)}))),
  clearModel:()=>ipcRenderer.invoke('pendant:clear-model'),
  openEditor:()=>ipcRenderer.send('pendant:editor'),
  showMenu:()=>ipcRenderer.send('pendant:menu'),
  hide:()=>ipcRenderer.send('pendant:hide'),
  toggleLock:()=>ipcRenderer.send('pendant:lock'),
  beginMove:()=>ipcRenderer.send('pendant:move-start'),
  endMove:()=>ipcRenderer.send('pendant:move-end'),
  reportReady:state=>ipcRenderer.send('pendant:ready',state),
  onAction:callback=>{const listener=(_,action)=>callback(action);ipcRenderer.on('pendant:action',listener);return ()=>ipcRenderer.removeListener('pendant:action',listener);}
});
