@echo off
echo 🚀 Deploying fixes for WhatsApp Message Blast Easy...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI is not installed. Please install it first:
    echo npm install -g vercel
    pause
    exit /b 1
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Not logged in to Vercel. Please login first:
    echo vercel login
    pause
    exit /b 1
)

echo 📦 Building project...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed. Please fix the build errors first.
    pause
    exit /b 1
)

echo 🌐 Deploying to Vercel...
call vercel --prod

if %errorlevel% equ 0 (
    echo ✅ Deployment successful!
    echo.
    echo 🔧 Next steps:
    echo 1. Apply the database migration to fix the media constraint:
    echo    supabase db push
    echo.
    echo 2. Test the create template functionality
    echo 3. Test the media sync functionality
    echo.
    echo 📝 The following issues have been fixed:
    echo ✅ Missing /api/create-template endpoint
    echo ✅ Database constraint violation for media table
    echo ✅ Improved media sync logic
    echo ✅ Updated Vercel configuration
) else (
    echo ❌ Deployment failed. Please check the error messages above.
    pause
    exit /b 1
)

pause
