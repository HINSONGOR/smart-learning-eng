@echo off
rem Smart English - allow phones/tablets on the same home Wi-Fi to connect.
rem Anyone on the same Wi-Fi can open the app. Do not use on public Wi-Fi.
cd /d "%~dp0"
if not exist ".next\BUILD_ID" (
  echo First run: building the app, please wait...
  call npm run build || goto :error
)
echo.
echo Open one of these addresses on your phone or tablet (same Wi-Fi):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo    http://%%a:3000
echo.
echo If Windows Firewall asks, allow access on PRIVATE networks only.
echo Keep this window open. Press Ctrl+C or close this window to stop.
echo.
call npm run start:lan
goto :eof

:error
echo Build failed. Please send the messages above to your developer.
pause
