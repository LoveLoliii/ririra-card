param([switch]$CheckOnly,[switch]$Test)
$ErrorActionPreference='Stop'
$project=Split-Path $PSScriptRoot -Parent
Push-Location $project
try {
  if (-not (Get-Command link.exe -ErrorAction SilentlyContinue)) {
    $vswhere='C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
    $install=& $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if (-not $install) { throw '需要安装 Visual Studio C++ 桌面开发工具及 Windows SDK。' }
    $vcvars=Join-Path $install 'VC\Auxiliary\Build\vcvars64.bat'
    $compilerEnv=& cmd.exe /d /c "`"$vcvars`" >nul && set"
    if ($LASTEXITCODE -ne 0) { throw '无法加载 Visual C++ 编译环境。' }
    foreach ($line in $compilerEnv) { if ($line -match '^([^=]+)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1],$matches[2],'Process') } }
  }
  # Optional local SDK extracted from Microsoft's official NuGet packages.
  $portableSdk=Join-Path (Split-Path $project -Parent) 'tools/windows-sdk'
  if (Test-Path (Join-Path $portableSdk 'x64/c/um/x64/kernel32.Lib')) {
    $sdkRoot=Join-Path $portableSdk 'sdk/c'
    $env:LIB="$(Join-Path $portableSdk 'x64/c/um/x64');$(Join-Path $portableSdk 'x64/c/ucrt/x64');$env:LIB"
    $sdkInclude=Join-Path $sdkRoot 'Include/10.0.26100.0'
    $env:INCLUDE="$sdkInclude/um;$sdkInclude/shared;$sdkInclude/ucrt;$sdkInclude/winrt;$env:INCLUDE"
    $env:PATH="$(Join-Path $sdkRoot 'bin/10.0.26100.0/x64');$env:PATH"
    $env:WindowsSdkDir=$sdkRoot+'\'
    $env:WindowsSDKVersion='10.0.26100.0\'
  }
  node scripts/prepare-lite.cjs
  if ($LASTEXITCODE -ne 0) { throw '渲染资源准备失败' }
  if ($Test) { cargo test --locked --release --features custom-protocol --manifest-path src-tauri/Cargo.toml }
  elseif ($CheckOnly) { cargo check --locked --features custom-protocol --manifest-path src-tauri/Cargo.toml }
  else { cargo build --locked --release --features custom-protocol --manifest-path src-tauri/Cargo.toml }
  if ($LASTEXITCODE -ne 0) { throw 'Rust 构建失败' }
  if (-not $CheckOnly -and -not $Test) {
    New-Item -ItemType Directory -Force -Path dist | Out-Null
    Copy-Item -LiteralPath src-tauri/target/release/ririra-pendant-lite.exe -Destination dist/Ririra-Card-Pendant-Lite-0.3.0-Windows.exe -Force
    node scripts/package-lite.cjs
    if ($LASTEXITCODE -ne 0) { throw '轻量版分发包生成失败' }
    Compress-Archive -LiteralPath dist/Ririra-Card-Pendant-Lite-0.3.0 -DestinationPath dist/Ririra-Card-Pendant-Lite-0.3.0.zip -Force
    Get-Item dist/Ririra-Card-Pendant-Lite-0.3.0-Windows.exe | Select-Object Name,Length
  }
} finally { Pop-Location }
