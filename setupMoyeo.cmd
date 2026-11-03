@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js LTS first: https://nodejs.org/
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm is missing. Reinstall Node.js LTS: https://nodejs.org/
  pause
  exit /b 1
)
call npm.cmd run setup
if errorlevel 1 (
  echo Installation failed. Check the message above.
  pause
  exit /b 1
)
pause
