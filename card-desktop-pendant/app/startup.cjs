// Portable builds must register the persistent outer EXE, not the extracted Temp EXE.
function createStartup(app,runtime=process){
  const supported=runtime.platform==='win32'&&app.isPackaged;
  const options={name:'Ririra Card Pendant',path:runtime.env.PORTABLE_EXECUTABLE_FILE||runtime.execPath,args:[]};
  function isEnabled(){
    if(!supported)return false;
    const state=app.getLoginItemSettings({path:options.path,args:options.args});
    // openAtLogin checks Electron's default registry name; we use our own stable name.
    return state.launchItems.some(item=>item.name===options.name&&item.enabled);
  }
  function setEnabled(value){
    if(!supported)throw Error('请使用打包后的 Windows 程序设置开机启动');
    app.setLoginItemSettings({...options,openAtLogin:!!value,enabled:!!value});
    const enabled=isEnabled();
    if(enabled!==!!value)throw Error('Windows 未能更新开机启动设置，请检查系统启动应用设置');
    return enabled;
  }
  return {supported,isEnabled,setEnabled};
}
module.exports={createStartup};
