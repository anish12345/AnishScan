@echo off
echo ===== Testing Connection to MCP Server =====
echo.

if not exist node_modules (
  echo Installing dependencies...
  call npm install axios
)

echo Running connection test...
node test-connection.js
echo.
echo ===== Test Complete =====
pause 