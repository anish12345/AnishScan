@echo off
echo ===== OWASP Scanner Agent Startup =====
echo.

echo Checking configuration...
node setup-config.js
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Configuration setup failed with error code %ERRORLEVEL%
  goto error
)

echo.
echo Creating temp directory if it doesn't exist...
if not exist temp mkdir temp

echo.
echo Checking for semgrep installation...
C:\Users\Anish.Zala\.local\bin\semgrep.exe --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo WARNING: semgrep is not installed or not in PATH
  echo Please install semgrep using: pip install semgrep
  echo C# scanning functionality will not work without semgrep
  echo.
  echo Press any key to continue anyway or Ctrl+C to cancel...
  pause >nul
) else (
  echo Semgrep found successfully!
)

echo.
echo Checking dependencies...
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed with error code %ERRORLEVEL%
    goto error
  )
)

echo.
echo Starting OWASP Scanner Agent...
call node src/index.js
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Agent exited with error code %ERRORLEVEL%
  goto error
)

goto end

:error
echo.
echo ===== ERROR: Agent failed to start properly =====
echo Please check the error messages above
pause
exit /b 1

:end
echo.
echo ===== Agent has stopped =====
pause 