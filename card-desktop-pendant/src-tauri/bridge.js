(()=>{
  const invoke=(command,args)=>window.__TAURI__.core.invoke(command,args);
  const call=(name)=>()=>invoke(name).catch(console.error);
  window.desktopPendant={
    getState:()=>invoke('get_state'),saveCard:card=>invoke('save_card',{card}),
    importCard:call('choose_card'),importCardFile:()=>invoke('choose_card'),
    showMenu:call('show_menu'),hide:call('hide_widget'),toggleLock:call('toggle_lock'),
    beginMove:call('begin_move'),endMove:call('save_window'),
    reportReady:state=>invoke('renderer_ready',{state:{...state,screenshot:document.querySelector('#canvas').toDataURL('image/png'),webgl:!!document.querySelector('#canvas').getContext('webgl2'),pageTransparent:getComputedStyle(document.body).backgroundColor==='rgba(0, 0, 0, 0)'}}).catch(console.error),
    onAction:callback=>{let disposed=false,unlisten;window.__TAURI__.event.listen('pendant-action',event=>callback(event.payload)).then(fn=>{unlisten=fn;if(disposed)fn();});return()=>{disposed=true;unlisten?.();};}
  };
  document.addEventListener('pointerdown',event=>{if(event.target.closest('.pendant-grip')){event.preventDefault();window.desktopPendant.beginMove();}},true);
  window.addEventListener('error',event=>invoke('frontend_error',{message:String(event.message)}).catch(()=>{}));
  window.addEventListener('unhandledrejection',event=>invoke('frontend_error',{message:String(event.reason)}).catch(()=>{}));
})();
