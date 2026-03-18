# Production Deployment Guide

## Quick Deploy (Recommended)

On your production server, run:

```bash
chmod +x deploy.sh
./deploy.sh
```

This will:
1. Stop the current server
2. Pull latest code
3. Install dependencies
4. Build optimized production bundle
5. Start with PM2

## Manual Deployment Steps

If you prefer to run commands manually:

### 1. Stop Development Server
```bash
# Stop any running dev processes
pm2 stop all
# Or kill the dev server if running directly
pkill -f "tsx watch"
```

### 2. Pull Latest Code
```bash
git pull origin main
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Build Production Bundle
```bash
npm run build
```

This creates optimized files in `dist/` folder:
- Minified JavaScript
- Optimized CSS
- Compressed assets
- **No Vite HMR** (much faster!)

### 5. Start Production Server

**Option A: Using PM2 (Recommended)**
```bash
pm2 start ecosystem.config.json
pm2 save
pm2 startup  # Enable auto-start on reboot
```

**Option B: Direct Node**
```bash
NODE_ENV=production node dist/index.cjs
```

## PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs fiscalstack

# Restart
pm2 restart fiscalstack

# Stop
pm2 stop fiscalstack

# Monitor
pm2 monit
```

## Performance Verification

After deployment, check:

1. **No Vite messages** in browser console
2. **Fast page load** (<2 seconds)
3. **Minified code** in network tab
4. **Production mode** in server logs

## Troubleshooting

### Issue: Still seeing Vite messages
**Solution**: You're running dev mode. Run `pm2 stop all` and use the deployment script.

### Issue: Build fails
**Solution**: 
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Port already in use
**Solution**:
```bash
pm2 stop all
# Or find and kill the process
lsof -ti:5000 | xargs kill -9
```

## Environment Variables

Make sure your `.env` file on the server has:
```
NODE_ENV=production
DATABASE_URL=your_production_db_url
PORT=5000
```

## Nginx Configuration (Optional)

If using Nginx as reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Auto-Deploy on Git Push (Optional)

Set up a webhook or GitHub Action to auto-deploy:

```bash
# Add to your GitHub Actions workflow
- name: Deploy to Production
  run: |
    ssh user@server 'cd /var/www/fisczim && ./deploy.sh'
```
