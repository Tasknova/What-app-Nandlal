@echo off
echo 🚀 Deploying Delete Template Functionality...

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

echo ✅ Vercel CLI is ready

REM Build the project
echo 📦 Building project...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✅ Build completed successfully

REM Deploy to Vercel
echo 🚀 Deploying to Vercel...
call vercel --prod

if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    pause
    exit /b 1
)

echo ✅ Deployment completed successfully!

echo.
echo 🎉 Delete Template API endpoint should now be available at:
echo    /api/delete-template
echo.
echo 📋 Next steps:
echo    1. Test the delete functionality in your app
echo    2. Check Vercel logs if there are any issues
echo    3. Verify the endpoint is working correctly
echo.
echo 🔍 To check if the endpoint is working, you can test it with:
echo    curl -X DELETE https://your-vercel-domain.vercel.app/api/delete-template

pause
