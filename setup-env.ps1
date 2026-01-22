# PowerShell script to update .env file for Supabase
# Run this script and it will prompt you for your API keys

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Supabase .env Configuration Helper" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "You need to get your API keys from:" -ForegroundColor Yellow
Write-Host "https://app.supabase.com/project/tzczbbsdvrlonwjwcwss/settings/api" -ForegroundColor Green
Write-Host ""

# Prompt for API keys
Write-Host "Please enter your Supabase ANON KEY (public):" -ForegroundColor Yellow
$anonKey = Read-Host

Write-Host ""
Write-Host "Please enter your Supabase SERVICE ROLE KEY (secret):" -ForegroundColor Yellow
$serviceKey = Read-Host

Write-Host ""
Write-Host "Creating .env file..." -ForegroundColor Cyan

# Create .env content
$envContent = @"
# Supabase Configuration
SUPABASE_URL=https://tzczbbsdvrlonwjwcwss.supabase.co
SUPABASE_ANON_KEY=$anonKey
SUPABASE_SERVICE_KEY=$serviceKey

# Database URL
SUPABASE_DB_URL=postgresql://postgres.tzczbbsdvrlonwjwcwss:9TPewLiNYgoeu406@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

# Application
NODE_ENV=development
PORT=5000
"@

# Write to .env file
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "✅ .env file created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run db:push" -ForegroundColor White
Write-Host "2. Run: npm run dev" -ForegroundColor White
Write-Host ""
