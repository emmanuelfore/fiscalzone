# Vercel Deployment Guide

## Current Issue
Your app has both a backend (Express) and frontend (React/Vite), but Vercel is configured incorrectly.

## Solution

Your app needs to be deployed as a **monorepo** with:
- Frontend: Static files from `dist/public`
- Backend: Serverless function from `api/index.ts`

## Quick Fix

**Option 1: Use Vercel's automatic detection (RECOMMENDED)**

Delete `vercel.json` entirely and let Vercel auto-detect:

```bash
git rm vercel.json
git commit -m "Remove vercel.json - use auto-detection"
git push
```

Then in Vercel Dashboard:
1. Go to Project Settings → General
2. Set **Build Command**: `npm run build`
3. Set **Output Directory**: `dist/public`
4. Set **Install Command**: `npm install`

**Option 2: Keep vercel.json but simplify it**

Replace `vercel.json` with:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "framework": null
}
```

## Why it's failing

1. The `routes` configuration is conflicting with automatic routing
2. TypeScript error in `server/routes.ts` line 1615 (already fixed in latest commit)
3. Vercel can't find the output directory

## Next Steps

Try Option 1 first (delete vercel.json). If that doesn't work, we'll configure it manually in the dashboard.
