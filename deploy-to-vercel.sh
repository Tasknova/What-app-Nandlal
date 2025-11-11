#!/bin/bash

# 🚀 Vercel Deployment Script for WhatsApp Message Blast App
# This script automates the deployment process to Vercel

echo "🚀 Starting Vercel Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Vercel CLI is installed
print_status "Checking Vercel CLI installation..."
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI is not installed. Installing now..."
    npm install -g vercel
    if [ $? -ne 0 ]; then
        print_error "Failed to install Vercel CLI. Please install manually: npm install -g vercel"
        exit 1
    fi
else
    print_success "Vercel CLI is already installed"
fi

# Check if user is logged in to Vercel
print_status "Checking Vercel login status..."
if ! vercel whoami &> /dev/null; then
    print_warning "Not logged in to Vercel. Please login:"
    vercel login
    if [ $? -ne 0 ]; then
        print_error "Failed to login to Vercel"
        exit 1
    fi
else
    print_success "Already logged in to Vercel"
fi

# Check if all required files exist
print_status "Checking required files..."
required_files=(
    "api/fetch-templates.js"
    "api/fetch-media.js"
    "api/send-message.js"
    "vercel.json"
    "package.json"
    "vite.config.ts"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done
print_success "All required files found"

# Check if build works locally
print_status "Testing local build..."
npm run build
if [ $? -ne 0 ]; then
    print_error "Local build failed. Please fix build issues before deploying"
    exit 1
fi
print_success "Local build successful"

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod --yes

if [ $? -eq 0 ]; then
    print_success "Deployment successful! 🎉"
    echo ""
    echo "📋 Next steps:"
    echo "1. Set up environment variables in Vercel dashboard:"
    echo "   - VITE_SUPABASE_URL"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo "   - NODE_ENV=production"
    echo ""
    echo "2. Test your deployed application"
    echo "3. Configure custom domain if needed"
    echo "4. Set up monitoring and analytics"
    echo ""
    print_success "Your app is now live on Vercel! 🚀"
else
    print_error "Deployment failed. Please check the error messages above"
    exit 1
fi
