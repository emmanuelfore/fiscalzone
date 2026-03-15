# ZIMRA Environment Switching - Quick Start Checklist

## ✅ Pre-Implementation Checklist

- [ ] Backup `server/routes.ts`
- [ ] Backup `shared/schema.ts`
- [ ] Ensure no fiscal days are currently open
- [ ] Have database access ready

## 🚀 Implementation Checklist (30 minutes)

### Phase 1: Database & Core Files (5 minutes)

- [ ] **1.1** Schema already updated ✅
  - File: `shared/schema.ts`
  - Added: `zimraEnvironment: text("zimra_environment").default("test")`

- [ ] **1.2** Helper function already added ✅
  - File: `server/zimra.ts`
  - Added: `getZimraBaseUrl()` function

- [ ] **1.3** Run database migration
  ```bash
  npx drizzle-kit push
  ```
  - Verify column added to companies table

### Phase 2: Update routes.ts (15 minutes)

- [ ] **2.1** Add import at top of `server/routes.ts` (line ~11)
  ```typescript
  import { ZimraDevice, type ReceiptData, ZimraApiError, getZimraBaseUrl } from "./zimra";
  ```

- [ ] **2.2** Add environment endpoints after line 74
  - Copy from: `server/zimra-environment-endpoints.ts`
  - Paste after: `app.patch("/api/companies/:id", ...)`
  - Two endpoints: POST and GET `/api/companies/:id/zimra/environment`

- [ ] **2.3** Update ZimraDevice initializations (10 locations)
  
  **Location 1** (~line 90): Device Registration
  ```typescript
  baseUrl: getZimraBaseUrl('test') // Always test for registration
  ```
  
  **Location 2** (~line 128): Verify Taxpayer
  ```typescript
  baseUrl: getZimraBaseUrl('test') // Always test for verification
  ```
  
  **Location 3** (~line 154): Issue Certificate
  ```typescript
  baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
  ```
  
  **Location 4** (~line 195): Get Server Certificate
  ```typescript
  baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
  ```
  
  **Location 5** (~line 357): Get Status
  ```typescript
  baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
  ```
  
  **Location 6** (~line 393): Config Sync
  ```typescript
  baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
  ```
  
  **Location 7** (~line 438): Ping
  ```typescript
  baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
  ```
  
  **Location 8** (~line 474): Open Day
  ```typescript
  baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
  ```
  
  **Location 9** (~line 536): Close Day
  ```typescript
  baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
  ```
  
  **Location 10** (~line 721): Fiscalize Invoice
  ```typescript
  baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
  ```

### Phase 3: Testing (10 minutes)

- [ ] **3.1** TypeScript compilation
  ```bash
  npx tsc --noEmit
  ```
  - Should have no errors in routes.ts, zimra.ts, schema.ts

- [ ] **3.2** Start server
  ```bash
  npm run dev
  ```

- [ ] **3.3** Test GET environment endpoint
  ```bash
  curl http://localhost:5000/api/companies/1/zimra/environment
  ```
  - Expected: `{"environment":"test", ...}`

- [ ] **3.4** Test switch to production
  ```bash
  curl -X POST http://localhost:5000/api/companies/1/zimra/environment \
    -H "Content-Type: application/json" \
    -d '{"environment":"production"}'
  ```
  - Expected: Success with warning message

- [ ] **3.5** Test switch back to test
  ```bash
  curl -X POST http://localhost:5000/api/companies/1/zimra/environment \
    -H "Content-Type: application/json" \
    -d '{"environment":"test"}'
  ```
  - Expected: Success

- [ ] **3.6** Test fiscal day protection
  - Open a fiscal day
  - Try to switch environment
  - Expected: Error "Cannot switch environment while fiscal day is open"

- [ ] **3.7** Verify ZIMRA API calls use correct URL
  - Check logs when making ZIMRA API calls
  - Test environment: Should see `fdmsapitest.zimra.co.zw`
  - Production environment: Should see `fdmsapi.zimra.co.zw`

## 📋 Post-Implementation Checklist

- [ ] **4.1** Update documentation
  - Add environment switching to user guide
  - Document the warning about production mode

- [ ] **4.2** Create UI component
  - Add environment switcher to company settings
  - Show current environment status
  - Display warnings appropriately

- [ ] **4.3** Set up monitoring
  - Log all environment switches
  - Alert on production switches
  - Track which companies are in production

- [ ] **4.4** Train users
  - Explain test vs production
  - Show how to switch
  - Emphasize production warnings

## 🎯 Quick Test Script

```bash
#!/bin/bash
# Save as test-environment-switching.sh

COMPANY_ID=1
BASE_URL="http://localhost:5000"

echo "1. Checking current environment..."
curl -s "$BASE_URL/api/companies/$COMPANY_ID/zimra/environment" | jq

echo -e "\n2. Switching to production..."
curl -s -X POST "$BASE_URL/api/companies/$COMPANY_ID/zimra/environment" \
  -H "Content-Type: application/json" \
  -d '{"environment":"production"}' | jq

echo -e "\n3. Verifying switch..."
curl -s "$BASE_URL/api/companies/$COMPANY_ID/zimra/environment" | jq

echo -e "\n4. Switching back to test..."
curl -s -X POST "$BASE_URL/api/companies/$COMPANY_ID/zimra/environment" \
  -H "Content-Type: application/json" \
  -d '{"environment":"test"}' | jq

echo -e "\n5. Final verification..."
curl -s "$BASE_URL/api/companies/$COMPANY_ID/zimra/environment" | jq

echo -e "\n✅ Environment switching test complete!"
```

## 🐛 Troubleshooting

**Issue**: TypeScript errors after changes
- **Fix**: Run `npx tsc --noEmit` to see specific errors
- **Common**: Missing import of `getZimraBaseUrl`

**Issue**: Database migration fails
- **Fix**: Check database connection
- **Fix**: Manually add column: `ALTER TABLE companies ADD COLUMN zimra_environment TEXT DEFAULT 'test';`

**Issue**: Environment doesn't persist
- **Fix**: Verify database migration succeeded
- **Fix**: Check `zimra_environment` column exists in companies table

**Issue**: Still using test URL in production
- **Fix**: Verify all 10 ZimraDevice initializations updated
- **Fix**: Check logs to see which URL is being used

## 📊 Verification Commands

```bash
# Check database column exists
psql -d your_database -c "SELECT column_name FROM information_schema.columns WHERE table_name='companies' AND column_name='zimra_environment';"

# Check current environment for all companies
psql -d your_database -c "SELECT id, name, zimra_environment FROM companies;"

# Check TypeScript compilation
npx tsc --noEmit | grep -E "(routes|zimra|schema).ts"

# Test API endpoint
curl -i http://localhost:5000/api/companies/1/zimra/environment
```

## ✨ Success Criteria

- [x] Database migration successful
- [x] TypeScript compiles without errors
- [x] Can get current environment
- [x] Can switch to production
- [x] Can switch to test
- [x] Cannot switch with open fiscal day
- [x] Production warning displayed
- [x] Correct URL used for each environment
- [x] Environment persists across restarts

## 📝 Notes

- Default environment is 'test' for all companies
- Registration and verification always use test environment
- All other operations use company's configured environment
- Fiscal day must be closed before switching
- Production switches are logged with warnings

---

**Estimated Time**: 30 minutes
**Difficulty**: Medium
**Risk**: Low (safe to rollback)
**Impact**: High (enables production use)
