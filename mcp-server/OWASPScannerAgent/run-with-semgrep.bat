@echo off
echo ===== OWASP Scanner Agent with Semgrep =====
echo.

echo Checking Python installation...
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Python not found. Please install Python and try again.
  goto error
)

echo Checking semgrep installation...
python -c "import semgrep" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo Installing semgrep...
  pip install semgrep
  if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install semgrep.
    goto error
  )
)

echo Adding Python scripts to PATH...
for /f "tokens=*" %%i in ('python -m site --user-site') do set PYTHON_SITE=%%i
set PYTHON_SCRIPTS=%PYTHON_SITE:site-packages=Scripts%
echo Python scripts directory: %PYTHON_SCRIPTS%
set PATH=%PATH%;%PYTHON_SCRIPTS%

echo Checking if semgrep is now in PATH...
where semgrep >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo WARNING: semgrep still not found in PATH.
  echo You may need to manually add it to your PATH or restart your computer.
) else (
  echo Semgrep found in PATH.
)

echo.
echo Checking configuration...
node setup-config.js

echo.
echo Creating temp directory if it doesn't exist...
if not exist temp mkdir temp

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
node src/index.js
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