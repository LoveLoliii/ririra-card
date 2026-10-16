# B · Card Desktop Pendant 桌面卡片播放器

A 是原来的闪卡制作工作台；B 是本目录的桌面挂件。**A 制作并导出 `.ririra`，B 导入后展示。**

当前提供 **0.3.0 Lite 轻量版（Tauri + 系统 WebView2）**，单文件 EXE 约 5 MB，直接运行 `dist/Ririra-Card-Pendant-Lite-0.3.0-Windows.exe`。原 Electron 0.2.0 仍保留，便于回退。两个版本共用卡片缓存与设置，请一次只运行一个版本。

Lite 面向 Windows 10 / 11，不随包附带 WebView2 运行库。多数电脑已有；缺少时程序会提示并询问是否打开微软下载页面，安装后再打开挂件。`.ririra` 卡片和首次运行后生成的缓存不计入 EXE 体积。没有安装依赖时也不会联网下载角色、卡面或其他资源。

## 使用

1. 在 A 里完成模型、背景、文字、边框、灯光与特效，调整好观察角度。
2. 点击 A 的 **导出 .ririra 卡片**。
3. 双击本目录的 **启动桌面挂件.cmd**，默认优先启动 Lite；也可直接运行 `dist/Ririra-Card-Pendant-Lite-0.3.0-Windows.exe`。
4. 在 B 点击顶部 **＋** 或托盘菜单 **导入ririra卡片**，选择文件。也可以把文件拖到卡片上。

B 导入后会缓存所需资源，重启后继续显示上次导入的卡片。可以删除或移动原 `.ririra` 文件；修改卡面时回到 A，重新导出并导入即可。

分享给朋友时，发送 **B 的单文件便携 EXE + .ririra 卡片文件**。朋友不需要 A、FF14、Blender 或 Node.js。首次未导入卡片时显示原创水晶示例。B 不再读取上级 A 文件夹中的角色素材。

## 操作

| 操作 | 效果 |
| --- | --- |
| 顶部 ＋ / 托盘“导入卡片” | 选择 .ririra 文件 |
| 拖入 .ririra | 导入并切换卡片 |
| 左键拖动卡面 | 自由旋转 |
| 滚轮 | 缩放画面 |
| 双击卡片 / 顶部 ↺ | 恢复正面 |
| 拖动顶部 ⠿ / Alt + 拖动 | 移动挂件 |
| 右键 / 顶部 ⋯ / 托盘菜单 | 置顶、大小、锁定、暂停特效、隐藏、退出 |
| Ctrl + Alt + C / 双击托盘 | 显示并解锁挂件 |

工具栏在鼠标悬停时出现。锁定后鼠标穿透窗口；重新启动会自动解锁，防止找不到操作入口。取消置顶后会像普通窗口一样被其他应用遮挡。它是独立透明窗口，不嵌入 Windows 壁纸层。

挂件菜单和托盘菜单中的 **开机自动启动** 默认关闭，勾选后在 Windows 登录时启动，取消勾选即可关闭。便携版请放在固定位置后再启用；移动 EXE 后重新开关一次该选项。

拖动后会记住挂件的位置和大小，再次打开时回到上次的位置并显示卡片；首次使用放在屏幕右下方。显示器断开或分辨率变化时会将窗口调整回可见区域。

也可把 `.ririra` 文件拖到 EXE 上打开，或使用命令行 `Ririra-Card-Pendant-0.2.0-Windows.exe "我的卡片.ririra"`。没有注册系统文件关联。

## 文件包含什么

完整 GLB 模型及贴图、原始背景与前景、文字、背景/边框样式、渲染风格、灯光、特效、人物透明度和相机角度。模型摆放已写入 GLB；模型以当前姿态保存，不包含游戏动作库。三维模型仍可实时旋转，特效仍可循环。

文件有版本号、长度与资源校验，不包含应用代码或本机绝对路径。资源说明见 [Ririra 格式](core/ririra-format/README.md)。B 的设置和卡片资源保存在 `%APPDATA%/Ririra Card Pendant/`。

## 开发

需要 Node.js ≥ 22.12。依赖锁定在 package-lock.json。

```sh
npm ci
npm start
npm run check
npm test
npm run smoke
npm run pack
npm run dist
```

`npm run pack` 生成 `dist/win-unpacked/`，该目录的 EXE 需与同目录运行库一起保留。`npm run dist` 生成可单独分享的便携 EXE。

`npm run preview` 可在浏览器检查外观；原生托盘、文件导入、置顶和鼠标穿透需在桌面程序中使用。`npm run smoke -- "文件.ririra"` 用真实 Electron 窗口检查导入和渲染，然后退出。

- `app/`：窗口、托盘、本机资源服务及卡片缓存。
- `renderer/`：挂件交互与原生桥接。
- `core/`：独立的卡面渲染核心与 Ririra 格式读取器。
- `test/`：设置恢复、资源校验与导入持久化检查。

代码遵循 [AGPL-3.0-or-later](LICENSE)，依赖保留 [第三方许可](THIRD_PARTY_NOTICES.md)。格式许可证不包含用户模型或游戏素材的权利。

## Lite 原生端开发

`src-tauri/` 为 Rust 原生端；`scripts/prepare-lite.cjs` 将当前 `core/` 和 `renderer/` 复制到 `web-lite/`，作为 EXE 内嵌资源，卡面渲染代码与 Electron 版保持共用。没有附带 Node.js、Blender 或 HTTP 服务。

需要 Rust MSVC 工具链、Visual Studio C++ 桌面开发工具、Windows SDK、Node.js 和 PowerShell 7。依赖版本由 `src-tauri/Cargo.lock` 锁定。

```powershell
npm run dist:lite
npm run test:lite
node scripts/smoke-lite.cjs "我的卡片.ririra"
```

`dist:lite` 生成单文件 EXE。`test:lite` 检查格式解析、损坏资源、越界路径和窗口位置恢复；`smoke-lite.cjs` 用实际 WebView2 导入卡片、删除测试用的源文件并再次启动，检查缓存、透明 WebGL 渲染、位置恢复、默认不启用开机启动和 EXE 小于十进制 10 MB。

自动测试使用独立目录；正常使用仍沿用 `%APPDATA%/Ririra Card Pendant/`。Lite 单独保存物理窗口坐标，保留旧版逻辑坐标用于迁移；开机启动需在想使用的版本中主动勾选，不会自动接管旧版的启动项。
