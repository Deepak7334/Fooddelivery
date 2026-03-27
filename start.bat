@echo off
echo ============================================
echo    FoodHub - Food Delivery App Starter
echo ============================================
echo.

:: Check if MongoDB is running
echo [1/3] Checking MongoDB...
sc query MongoDB >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo    MongoDB service found. Starting it...
    net start MongoDB >nul 2>&1
    echo    MongoDB started!
) else (
    echo    MongoDB service not found as a Windows service.
    echo    Trying to start mongod manually...
    if exist "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" (
        start "MongoDB" "C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe" --dbpath "C:\data\db"
    ) else if exist "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" (
        start "MongoDB" "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
    ) else if exist "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" (
        start "MongoDB" "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath "C:\data\db"
    ) else (
        echo.
        echo ============================================
        echo    WARNING: MongoDB not found!
        echo ============================================
        echo    Please:
        echo    1. Install MongoDB Community Server from:
        echo       https://www.mongodb.com/try/download/community
        echo    OR use MongoDB Atlas (cloud - free):
        echo       https://www.mongodb.com/atlas
        echo    2. Update MONGODB_URI in backend\.env
        echo ============================================
        echo.
    )
)

timeout /t 2 /nobreak >nul

echo.
echo [2/3] Starting Backend (port 5000)...
start "FoodHub Backend" cmd /k "cd /d c:\Foodhub\backend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo [3/3] Starting Frontend (port 5173)...
start "FoodHub Frontend" cmd /k "cd /d c:\Foodhub\frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ============================================
echo    FoodHub is Starting!
echo ============================================
echo.
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:5000
echo.
echo    Demo Credentials:
echo    Admin: admin@foodhub.com / Admin@123
echo    Restaurant: Created by admin
echo    Customer: Register a new account
echo.
echo ============================================

:: Open browser
timeout /t 5 /nobreak >nul
start http://localhost:5173

pause
