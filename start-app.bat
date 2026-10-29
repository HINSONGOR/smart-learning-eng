@echo off
rem Smart English - start on this computer only (http://localhost:3000)
cd /d "%~dp0"
if not exist ".next\BUILD_ID" (
  echo First run: building the app, please wait...
  call npm run build || goto :error
)
echo.
echo Smart English is starting at http://localhost:3000
echo Keep this window open while using the app. Press Ctrl+C or close this window to stop.
echo.
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
call npm start
goto :eof

:error
echo Build failed. Please send the messages above to your developer.
pause
