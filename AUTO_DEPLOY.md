# Auto-Deployment Setup Guide

This setup enables automatic deployment for **FiscalStack** and **FiscalZone** whenever you push to the `main` branch.

## Step 1: Generate SSH Keys
On your **local machine**, generate a new SSH key pair (do not use your server password in GitHub):
```bash
ssh-keygen -t rsa -b 4096 -f ./id_rsa_deploy
```
*Leave the passphrase empty.*

## Step 2: Add Public Key to Server
Copy the content of `id_rsa_deploy.pub` and append it to the `authorized_keys` file on your server (`161.97.115.59`):
```bash
# Run this on the server (logged in as root)
mkdir -p ~/.ssh
echo "PASTE_PUBLIC_KEY_CONTENT_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

## Step 3: Configure GitHub Secrets
Go to your GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**.

Add these secrets:
- `SERVER_HOST`: `161.97.115.59`
- `SERVER_USER`: `root`
- `SSH_PRIVATE_KEY`: Paste the entire content of the **private** key file (`id_rsa_deploy`).

## Step 4: How the Deployment Works
When you push to `main`, the following happens:

1. **GitHub connects to Port 22** via SSH.
2. **FiscalStack Deployment**:
   - Goes to `/var/www/fiszim`.
   - Runs `./deploy.sh fiscalstack`.
   - Reloads PM2 process named `fiscalstack`.
3. **FiscalZone Deployment**:
   - Goes to `/var/www/fiscalzone/fisczim`.
   - Runs `./deploy.sh fiscalzone`.
   - Reloads PM2 process named `fiscalzone`.

## Deployment Logic
The same code is pulled into both folders, but the `deploy.sh` script knows which brand to build based on the directory it's running in.

- **FiscalStack** runs on **Port 5000**.
- **FiscalZone** runs on **Port 5001**.

## Troubleshooting
- **Check Status**: `pm2 status`
- **Check Logs**: `pm2 logs fiscalstack` or `pm2 logs fiscalzone`
- **Manual Run**: You can always run `./deploy.sh [brand]` manually in its respective folder.
