@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "dist\Ririra-Card-Pendant-Lite-0.3.0-Windows.exe" (
  start "" "dist\Ririra-Card-Pendant-Lite-0.3.0-Windows.exe"
) else (
  echo 请先运行 npm run dist:lite 构建轻量版。
  pause
)
