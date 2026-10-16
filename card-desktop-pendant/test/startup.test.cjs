const {test}=require('node:test'),assert=require('node:assert/strict');
const {createStartup}=require('../app/startup.cjs');
test('开机启动默认不注册，便携版始终使用外层 EXE，可开启和关闭',()=>{
  let state={openAtLogin:false,launchItems:[]};const writes=[];
  const app={isPackaged:true,getLoginItemSettings:options=>{assert.equal(options.path,'C:\\Cards\\Ririra.exe');assert.deepEqual(options.args,[]);return state;},setLoginItemSettings:options=>{writes.push(options);state={openAtLogin:options.openAtLogin,launchItems:options.openAtLogin?[{name:options.name,enabled:options.enabled}]:[]};}};
  const startup=createStartup(app,{platform:'win32',execPath:'C:\\Temp\\extracted.exe',env:{PORTABLE_EXECUTABLE_FILE:'C:\\Cards\\Ririra.exe'}});
  assert.equal(startup.isEnabled(),false);assert.equal(writes.length,0);
  assert.equal(startup.setEnabled(true),true);assert.equal(writes[0].path,'C:\\Cards\\Ririra.exe');
  state.launchItems[0].enabled=false;assert.equal(startup.isEnabled(),false);
  assert.equal(startup.setEnabled(false),false);assert.equal(writes[1].openAtLogin,false);
});
test('未打包的开发程序不注册开机启动',()=>{
  const startup=createStartup({isPackaged:false},{platform:'win32',execPath:'electron.exe',env:{}});
  assert.equal(startup.supported,false);assert.equal(startup.isEnabled(),false);assert.throws(()=>startup.setEnabled(true));
});
