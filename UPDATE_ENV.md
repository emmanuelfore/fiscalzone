# ⚠️ IMPORTANT: You need to update your .env file

Your .env file currently has the old DATABASE_URL variable.
You need to update it with the new Supabase configuration.

## Option 1: Manual Update (Recommended)

Open your `.env` file and replace its contents with:

```
# Supabase Configuration
SUPABASE_URL=https://tzczbbsdvrlonwjwcwss.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY_HERE

# Database URL
SUPABASE_DB_URL=postgresql://postgres.tzczbbsdvrlonwjwcwss:9TPewLiNYgoeu406@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

# Application
NODE_ENV=development
PORT=5000
```

## Option 2: Get Your API Keys First

1. Visit: https://app.supabase.com/project/tzczbbsdvrlonwjwcwss/settings/api

2. You'll see two keys:
   - **anon** **public** - This is safe to use in client-side code
   - **service_role** **secret** - This is for server-side admin operations

3. Copy both keys and replace `YOUR_ANON_KEY_HERE` and `YOUR_SERVICE_KEY_HERE` in the .env file above

## Quick Command to Update .env

If you want, you can run this PowerShell command (but you still need to add your API keys):

```powershell
@"
# Supabase Configuration
SUPABASE_URL=https://tzczbbsdvrlonwjwcwss.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY_HERE

# Database URL
SUPABASE_DB_URL=postgresql://postgres.tzczbbsdvrlonwjwcwss:9TPewLiNYgoeu406@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

# Application
NODE_ENV=development
PORT=5000
"@ | Out-File -FilePath .env -Encoding UTF8
```

Then edit `.env` to add your actual API keys.

## After Updating .env

Once you've added your API keys, run:

```bash
npm run dev
```

The server should start successfully!
