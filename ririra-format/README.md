# Ririra 卡片格式 v1

`.ririra` 是独立的三维卡片包，由 A 制作并导出，B 导入并展示。包含当前三维模型与贴图、背景底图、前景层、卡面文字、背景/边框选择、渲染风格、灯光、特效、人物透明度、相机位置及观察目标。模型摆放变换已写入 GLB。模型按当前姿态导出；不包含游戏动作库。

二进制布局：8 字节 ASCII `RIRIRA01`，4 字节小端无符号 manifest 长度，UTF-8 JSON manifest，按清单顺序连续存放的资源。资源固定为 `model.glb`、`background.png`、`foreground.png`，可附带 `preview.png`。每个资源记录相对 payload 偏移、长度及 SHA-256。最大文件 512 MiB，manifest 最大 1 MiB。GLB 必须嵌入所需 buffer 和图片，不接受外部 URI。

Manifest `format` 为 `ririra-card`，`version` 和 `rendererVersion` 当前均为 1。未知版本应提示升级，不静默套用。校验资源清单、尺寸、长度、校验和与 GLB 结构后才激活卡片。包内不存本机绝对路径、FF14 原始 cache、浏览器存储或应用代码。

`format.js` 是浏览器和 Node/Electron 共用的读写实现。A、开源版 A 与 B 的核心各保留同一份版本。B 的程序内置相同的卡面绘制器，因此背景和特效仍可实时运行，卡片仍可自由旋转。
