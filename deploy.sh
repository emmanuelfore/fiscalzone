#!/bin/bash

# Multi-Brand Production Deployment Script (FiscalStack & FiscalZone)
# Standardized version for automated CI/CD

set -e  # Exit on error

echo "🚀 Starting Unified Multi-Brand Production Deployment..."
echo "=================================================="

# 1. Pull latest code
echo "📥 Pulling latest code from main..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Detect Brand
BRAND=$1

if [ -z "$BRAND" ]; then
    echo "❌ Error: Please specify a brand (fiscalstack or fiscalzone)"
    echo "Usage: ./deploy.sh [brand]"
    exit 1
fi

echo "🎯 Deploying brand: $BRAND"

# 4. Build the specific brand
echo "🔨 Building $BRAND..."
rm -rf dist
npm run "build:$BRAND"

# 5. Reload PM2 process
echo "🚀 Reloading PM2 process..."

if pm2 show "$BRAND" > /dev/null 2>&1; then
    echo "🔄 Reloading '$BRAND'..."
    pm2 reload "$BRAND" --update-env
else
    echo "✨ Starting '$BRAND'..."
    # If not running, we start it manually with the correct params
    if [ "$BRAND" == "fiscalstack" ]; then PORT=5000; else PORT=5001; fi
    cross-env NODE_ENV=production VITE_APP_BRAND=$BRAND PORT=$PORT pm2 start dist/index.cjs --name "$BRAND"
fi

# 6. Save PM2 state
echo "💾 Saving PM2 state..."
pm2 save

echo ""
echo "✅ Multi-brand deployment successful!"
echo "------------------------------------------"
pm2 status
echo ""
echo "📊 View logs: pm2 logs [name]"
