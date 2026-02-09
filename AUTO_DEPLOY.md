# Auto-Deployment Setup Guide

## Overview
This setup enables automatic deployment to your production server whenever you push to the `main` branch on GitHub.

## Setup Steps

### 1. Generate SSH Key on Your Local Machine

```bash
# Generate a new SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key

# This creates two files:
# - ~/.ssh/github_deploy_key (private key - keep secret!)
# - ~/.ssh/github_deploy_key.pub (public key)
```

### 2. Add Public Key to Your Server

```bash
# Copy the public key
cat ~/.ssh/github_deploy_key.pub

# SSH to your server
ssh root@your-server-ip

# Add the public key to authorized_keys
echo "paste-the-public-key-here" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### 3. Add Secrets to GitHub Repository

Go to your GitHub repository:
1. Click **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these three secrets:

**SECRET 1: SERVER_HOST**
- Name: `SERVER_HOST`
- Value: Your server IP or domain (e.g., `fiscalstack.co.zw` or `your.server.ip`)

**SECRET 2: SERVER_USER**
- Name: `SERVER_USER`
- Value: `root` (or your SSH username)

**SECRET 3: SSH_PRIVATE_KEY**
- Name: `SSH_PRIVATE_KEY`
- Value: Copy the entire private key:
  ```bash
  cat ~/.ssh/github_deploy_key
  ```
  Copy everything including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

### 4. Test the Workflow

```bash
# Commit and push the workflow file
git add .github/workflows/deploy.yml
git commit -m "Add auto-deployment workflow"
git push origin main
```

### 5. Monitor Deployment

1. Go to your GitHub repository
2. Click **Actions** tab
3. You'll see the deployment running
4. Click on it to see live logs

## How It Works

**Trigger:** Every push to `main` branch

**Process:**
1. GitHub Actions connects to your server via SSH
2. Pulls latest code from GitHub
3. Installs dependencies
4. Builds production bundle
5. Reloads PM2 process (zero downtime)
6. Saves PM2 configuration

**Deployment Time:** ~1-2 minutes

## Testing

Make a small change and push:

```bash
# Make a change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "Test auto-deployment"
git push origin main

# Watch it deploy automatically!
```

## Troubleshooting

### Deployment Fails with "Permission Denied"
- Check that the public key is in `/root/.ssh/authorized_keys` on server
- Verify SSH key permissions: `chmod 600 ~/.ssh/authorized_keys`

### Deployment Fails with "Host Key Verification Failed"
Add this to the workflow under `with:`:
```yaml
host_key_verification: false
```

### Want to Deploy Only Specific Files?
Add a path filter to the workflow:
```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'server/**'
      - 'client/**'
```

## Advanced: Deployment Notifications

### Slack Notifications
Add to workflow:
```yaml
- name: Slack Notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Discord Notifications
Add to workflow:
```yaml
- name: Discord Notification
  uses: sarisia/actions-status-discord@v1
  with:
    webhook: ${{ secrets.DISCORD_WEBHOOK }}
```

## Rollback

If a deployment breaks something:

```bash
# SSH to server
ssh root@your-server

# Rollback to previous commit
cd /var/www/fisczim
git log --oneline  # Find the previous commit hash
git reset --hard <previous-commit-hash>
npm run build
pm2 reload fiscalstack
```

## Security Notes

- ✅ Private key is stored securely in GitHub Secrets (encrypted)
- ✅ Only accessible to GitHub Actions
- ✅ Never committed to repository
- ✅ Can be rotated anytime by generating new keys

## Benefits

✅ **Zero-touch deployment** - Just push to GitHub
✅ **Fast** - Deploys in 1-2 minutes
✅ **Reliable** - Automated, consistent process
✅ **Traceable** - Full deployment logs in GitHub Actions
✅ **Zero downtime** - Uses PM2 reload
