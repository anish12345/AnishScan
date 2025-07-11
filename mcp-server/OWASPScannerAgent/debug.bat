@echo off
echo ===== OWASP Scanner Agent Debug Mode =====
echo.

echo Checking system information...
echo Node.js version:
node --version
echo.

echo NPM version:
npm --version
echo.

echo Checking network connectivity...
echo Testing connection to MCP server...
call test-connection.bat
echo.

echo Checking configuration...
node setup-config.js
echo.

echo Checking environment variables...
echo MCP_SERVER_URL: %MCP_SERVER_URL%
echo AGENT_PORT: %AGENT_PORT%
echo AGENT_NAME: %AGENT_NAME%
echo TEMP_DIR: %TEMP_DIR%
echo LOG_LEVEL: %LOG_LEVEL%
echo NODE_TLS_REJECT_UNAUTHORIZED: %NODE_TLS_REJECT_UNAUTHORIZED%
echo.

echo Checking dependencies...
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed with error code %ERRORLEVEL%
    goto error
  )
) else (
  echo Dependencies already installed.
)
echo.

echo Starting agent in debug mode...
set DEBUG=*
set NODE_TLS_REJECT_UNAUTHORIZED=0
node --trace-warnings src/index.js

:error
echo.
echo ===== Debug session ended =====
pause 