@echo off
cd /d "%~dp0"
call npm.cmd run setup
if errorlevel 1 (
  echo Installation failed. Check the message above.
  pause
  exit /b 1
)
pause
