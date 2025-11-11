#!/bin/bash

echo "🚀 Deploying Delete Template Functionality..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel. Please login first:"
    echo "vercel login"
    exit 1
fi

echo "✅ Vercel CLI is ready"

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    exit 1
fi

echo "✅ Deployment completed successfully!"

echo ""
echo "🎉 Delete Template API endpoint should now be available at:"
echo "   /api/delete-template"
echo ""
echo "📋 Next steps:"
echo "   1. Test the delete functionality in your app"
echo "   2. Check Vercel logs if there are any issues"
echo "   3. Verify the endpoint is working correctly"
echo ""
echo "🔍 To check if the endpoint is working, you can test it with:"
echo "   curl -X DELETE https://your-vercel-domain.vercel.app/api/delete-template"
