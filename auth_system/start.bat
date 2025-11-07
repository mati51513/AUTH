@echo off
echo Starting Auth System (Supabase-only) Development Environment...

:: Install server dependencies if node_modules doesn't exist
if not exist "server\node_modules" (
    echo Installing server dependencies...
    cd server
    npm install
    cd ..
)

:: Start the server (Supabase)
echo Starting server...
start cmd /k "cd server && npm run dev"

:: Wait for server to start
timeout /t 5 /nobreak

:: Open the panel in default browser (test-server runs on port 3000)
echo Opening panel in browser...
start http://localhost:3000/index.html

echo Development environment is now running!
echo Press any key to stop all services and exit...
pause

:: Stop the server (find and kill the Node.js process)
echo Stopping server...
taskkill /f /im node.exe >nul 2>&1

echo Development environment stopped.
