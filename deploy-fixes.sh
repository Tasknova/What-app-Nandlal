#!/bin/bash

echo "🚀 Deploying fixes for WhatsApp Message Blast Easy..."

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

echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix the build errors first."
    exit 1
fi

echo "🌐 Deploying to Vercel..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🔧 Next steps:"
    echo "1. Apply the database migration to fix the media constraint:"
    echo "   supabase db push"
    echo ""
    echo "2. Test the create template functionality"
    echo "3. Test the media sync functionality"
    echo ""
    echo "📝 The following issues have been fixed:"
    echo "✅ Missing /api/create-template endpoint"
    echo "✅ Database constraint violation for media table"
    echo "✅ Improved media sync logic"
    echo "✅ Updated Vercel configuration"
else
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi
