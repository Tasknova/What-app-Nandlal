@echo off
REM 🚀 Vercel Deployment Script for WhatsApp Message Blast App (Windows)
REM This script automates the deployment process to Vercel

echo 🚀 Starting Vercel Deployment...

REM Check if Vercel CLI is installed
echo [INFO] Checking Vercel CLI installation...
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Vercel CLI is not installed. Installing now...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Vercel CLI. Please install manually: npm install -g vercel
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] Vercel CLI is already installed
)

REM Check if user is logged in to Vercel
echo [INFO] Checking Vercel login status...
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Not logged in to Vercel. Please login:
    vercel login
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to login to Vercel
        pause
        exit /b 1
    )
) else (
    echo [SUCCESS] Already logged in to Vercel
)

REM Check if all required files exist
echo [INFO] Checking required files...
if not exist "api\fetch-templates.js" (
    echo [ERROR] Required file missing: api\fetch-templates.js
    pause
    exit /b 1
)
if not exist "api\fetch-media.js" (
    echo [ERROR] Required file missing: api\fetch-media.js
    pause
    exit /b 1
)
if not exist "api\send-message.js" (
    echo [ERROR] Required file missing: api\send-message.js
    pause
    exit /b 1
)
if not exist "vercel.json" (
    echo [ERROR] Required file missing: vercel.json
    pause
    exit /b 1
)
if not exist "package.json" (
    echo [ERROR] Required file missing: package.json
    pause
    exit /b 1
)
if not exist "vite.config.ts" (
    echo [ERROR] Required file missing: vite.config.ts
    pause
    exit /b 1
)
echo [SUCCESS] All required files found

REM Check if build works locally
echo [INFO] Testing local build...
npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Local build failed. Please fix build issues before deploying
    pause
    exit /b 1
)
echo [SUCCESS] Local build successful

REM Deploy to Vercel
echo [INFO] Deploying to Vercel...
vercel --prod --yes

if %errorlevel% equ 0 (
    echo [SUCCESS] Deployment successful! 🎉
    echo.
    echo 📋 Next steps:
    echo 1. Set up environment variables in Vercel dashboard:
    echo    - VITE_SUPABASE_URL
    echo    - VITE_SUPABASE_ANON_KEY
    echo    - NODE_ENV=production
    echo.
    echo 2. Test your deployed application
    echo 3. Configure custom domain if needed
    echo 4. Set up monitoring and analytics
    echo.
    echo [SUCCESS] Your app is now live on Vercel! 🚀
) else (
    echo [ERROR] Deployment failed. Please check the error messages above
    pause
    exit /b 1
)

pause
