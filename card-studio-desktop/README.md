# A · Ririra 桌面闪卡工作台

使用 Tauri + 系统 Microsoft Edge WebView2，模型、背景、边框、文字、灯光、特效与导出界面复用原 A 项目。B 是桌面挂件播放器，A 制作并导出 `.ririra`，交给 B 导入。原网页版保留。

## 使用

运行 `Ririra-Card-Studio.exe`（或本项目 `dist/Ririra-Card-Studio-0.1.0-Windows.exe`）。需要 Windows 10/11 和 WebView2 Runtime，不需要 Node.js 或 Rust。首次为原创水晶示例，不捆绑私有游戏模型。

- **GLB / 普通 glTF**：直接选择文件或完整文件夹，也可拖入画面。
- **FF14 原始导出**：需包含完整 `cache` 文件夹；点击顶部 **设置 Blender** 选择本机 `blender.exe`，随后导入完整文件夹。材质转换在本机后台完成。Blender 为可选外部工具，不随包分发。
- **导出**：PNG、GIF、`.ririra` 和已转换 GLB 均弹出系统保存对话框，选择保存位置。GIF 保留原来的分辨率选项与取消按钮。
- 卡面设置和已转换角色记录由 WebView2 本机存储保留；窗口位置与 Blender 路径保存到 `%APPDATA%/Ririra Card Studio/`。普通 GLB 模型再次打开需重新选择，行为与原网页版一致。

程序资源嵌入 EXE，无需启动浏览器、固定端口或 Node.js 服务。选择模型、转换和保存导出都在本机完成。B 的缓存和设置目录独立。

右侧设置按模型、观察、渲染、灯光、背景、边框、文字、特效和导出分组，默认折叠，支持“全部折叠”。设置面板独立滚动，不影响左侧预览。背景与边框缩略图展示完整卡面，列表可滚动浏览。程序界面使用正式名称“Ririra 闪卡工作台”，不显示文档中的 A/B 代称。

## 构建与测试

需要 Node.js、PowerShell 7、Rust MSVC、Visual Studio C++ 工具和 Windows SDK。

```powershell
npm run build
npm test
node scripts/smoke.cjs "自包含模型.glb"
```

构建产物位于 `dist/`，包含 EXE 和附带对应源码、许可证的 ZIP。开发目录从上级 A 同步前端，分发源码使用 `frontend/` 中的快照，可独立构建。Rust 依赖在 `src-tauri/Cargo.lock` 锁定。

自动测试使用独立数据目录，实际载入 WebView2、导入模型并导出 PNG、GIF、`.ririra`；导出的卡片还应交给 B 验证。

本项目遵循 AGPL-3.0-or-later。分发二进制时请同时提供对应源码及许可证。用户模型及游戏素材的权利不包含在代码许可中。
