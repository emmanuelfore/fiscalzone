#!/bin/bash

# FiscalStack Production Deployment Script
# Run this on your production server after pulling latest code

set -e  # Exit on error

echo "🚀 FiscalStack Production Deployment"
echo "===================================="

# 1. Stop current server
echo "📦 Stopping current server..."
pm2 stop fiscalstack || echo "No existing process to stop"

# 2. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 3. Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

# 4. Build frontend and backend
echo "🔨 Building production bundle..."
npm run build

# 5. Start with PM2
echo "🚀 Starting production server..."
pm2 start dist/index.cjs --name "fiscalstack" --time

# 6. Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# 7. Show status
echo ""
echo "✅ Deployment complete!"
echo ""
pm2 status
echo ""
echo "📊 View logs: pm2 logs fiscalstack"
echo "🔄 Restart: pm2 restart fiscalstack"
echo "⏹️  Stop: pm2 stop fiscalstack"
