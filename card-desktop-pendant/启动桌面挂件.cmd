@echo off
cd /d "%~dp0"
if exist "dist\Ririra-Card-Pendant-Lite-0.3.0-Windows.exe" (
  start "" "dist\Ririra-Card-Pendant-Lite-0.3.0-Windows.exe"
  exit /b
)
if exist "dist\win-unpacked\Ririra Card Pendant.exe" (
  start "" "dist\win-unpacked\Ririra Card Pendant.exe"
  exit /b
)
if not exist "node_modules\electron\dist\electron.exe" (
  echo First launch: installing desktop dependencies...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
start "" /min cmd /c "npm start"
