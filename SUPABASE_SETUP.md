# Supabase Setup Instructions

## 🔑 Getting Your Supabase API Keys

You need to get your Supabase API keys from your project dashboard. Here's how:

1. **Go to your Supabase project**: https://app.supabase.com/project/tzczbbsdvrlonwjwcwss

2. **Navigate to Settings → API**
   - Project URL: `https://tzczbbsdvrlonwjwcwss.supabase.co`
   - `anon` `public` key - This is your **SUPABASE_ANON_KEY**
   - `service_role` `secret` key - This is your **SUPABASE_SERVICE_KEY**

3. **Copy these keys and add them to your `.env` file**

## 📝 Update Your .env File

Create or update your `.env` file with the following:

```bash
# Supabase Configuration
SUPABASE_URL=https://tzczbbsdvrlonwjwcwss.supabase.co
SUPABASE_ANON_KEY=<paste your anon key here>
SUPABASE_SERVICE_KEY=<paste your service role key here>

# Database URL (already configured)
SUPABASE_DB_URL=postgresql://postgres.tzczbbsdvrlonwjwcwss:9TPewLiNYgoeu406@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

# Application
NODE_ENV=development
PORT=5000
```

## 🚀 Next Steps

After adding your keys to `.env`:

1. **Push the database schema to Supabase:**
   ```bash
   npm run db:push
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   ```

## ⚠️ Important Notes

- **Never commit your `.env` file** - It's already in `.gitignore`
- The **anon key** is safe to use in client-side code
- The **service role key** should ONLY be used server-side (it bypasses Row Level Security)
- Your database password is: `9TPewLiNYgoeu406`

## 🔒 Security Best Practices

1. **Enable Row Level Security (RLS)** on all tables in Supabase dashboard
2. **Create RLS policies** to ensure users can only access their own company data
3. **Use the anon key** for client-side operations
4. **Use the service role key** only for admin operations on the server

## 📚 Useful Links

- [Supabase Dashboard](https://app.supabase.com/project/tzczbbsdvrlonwjwcwss)
- [API Settings](https://app.supabase.com/project/tzczbbsdvrlonwjwcwss/settings/api)
- [Database](https://app.supabase.com/project/tzczbbsdvrlonwjwcwss/editor)
- [Authentication](https://app.supabase.com/project/tzczbbsdvrlonwjwcwss/auth/users)
