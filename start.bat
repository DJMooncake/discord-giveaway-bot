@echo off
node scripts/check-env.js
if errorlevel 1 exit /b %errorlevel%
call npm run start
