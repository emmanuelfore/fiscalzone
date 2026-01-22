# ZIMRA Test/Production Environment Switching - Summary

## ✅ What Was Implemented

### 1. Database Schema Update
- **File**: `shared/schema.ts`
- **Change**: Added `zimraEnvironment` field to companies table
- **Default**: `'test'`
- **Values**: `'test'` or `'production'`

### 2. Helper Function
- **File**: `server/zimra.ts`
- **Function**: `getZimraBaseUrl(environment: 'test' | 'production')`
- **Purpose**: Returns correct ZIMRA API base URL based on environment
  - Test: `https://fdmsapitest.zimra.co.zw`
  - Production: `https://fdmsapi.zimra.co.zw`

### 3. API Endpoints
Two new endpoints for environment management:

#### POST `/api/companies/:id/zimra/environment`
**Purpose**: Switch between test and production environments

**Request Body**:
```json
{
  "environment": "production"  // or "test"
}
```

**Safety Features**:
- ✅ Validates environment value
- ✅ Prevents switching when fiscal day is open
- ✅ Logs warning when switching to production
- ✅ Returns detailed response with warnings

#### GET `/api/companies/:id/zimra/environment`
**Purpose**: Get current environment status

**Response**:
```json
{
  "environment": "test",
  "baseUrl": "https://fdmsapitest.zimra.co.zw",
  "isProduction": false,
  "canSwitch": true,
  "fiscalDayOpen": false,
  "currentFiscalDayNo": 5
}
```

## 📁 Files Created

1. **`server/zimra-environment-endpoints.ts`**
   - Complete endpoint implementations
   - Ready to copy into routes.ts

2. **`ZIMRA_ENVIRONMENT_SWITCHING_GUIDE.md`**
   - Comprehensive implementation guide
   - Frontend integration examples
   - UI component examples
   - Testing checklist
   - Troubleshooting guide

3. **`ZIMRA_ROUTES_UPDATE_REFERENCE.ts`**
   - Quick reference for updating routes.ts
   - Shows exact locations to modify
   - Before/after code examples

## 🚀 Implementation Steps

### Step 1: Database Migration ✅
```bash
npx drizzle-kit push
```
This adds the `zimra_environment` column to companies table.

### Step 2: Add Import to routes.ts
At the top of `server/routes.ts`, update the import:
```typescript
import { ZimraDevice, type ReceiptData, ZimraApiError, getZimraBaseUrl } from "./zimra";
```

### Step 3: Add Environment Endpoints
Copy the code from `server/zimra-environment-endpoints.ts` and add it to `server/routes.ts` after line 74.

### Step 4: Update All ZimraDevice Initializations
Find all 10 locations where `new ZimraDevice()` is called and add:
```typescript
baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
```

See `ZIMRA_ROUTES_UPDATE_REFERENCE.ts` for exact locations.

### Step 5: Test
```bash
# Check current environment
curl http://localhost:5000/api/companies/1/zimra/environment

# Switch to production
curl -X POST http://localhost:5000/api/companies/1/zimra/environment \
  -H "Content-Type: application/json" \
  -d '{"environment":"production"}'

# Switch back to test
curl -X POST http://localhost:5000/api/companies/1/zimra/environment \
  -H "Content-Type: application/json" \
  -d '{"environment":"test"}'
```

## 🛡️ Safety Features

### 1. Fiscal Day Protection
- Cannot switch environments while fiscal day is open
- Prevents data inconsistency
- User must close fiscal day first

### 2. Production Warning
- Console warning when switching to production
- API response includes warning message
- Alerts user that transactions will be real

### 3. Validation
- Only accepts 'test' or 'production'
- Returns 400 error for invalid values
- Validates company exists

### 4. Logging
- Logs all environment switches
- Includes company ID and environment change
- Helps with audit trail

## 📊 Environment Comparison

| Feature | Test Environment | Production Environment |
|---------|-----------------|----------------------|
| Base URL | `fdmsapitest.zimra.co.zw` | `fdmsapi.zimra.co.zw` |
| Data | Test data only | Real ZIMRA data |
| Reporting | Not reported to ZIMRA | Officially reported |
| Certificates | Test certificates | Production certificates |
| Fiscal Days | Test fiscal days | Real fiscal days |
| Default | ✅ Yes | No |

## 🎯 Use Cases

### Development & Testing
```typescript
// Use test environment for development
await switchEnvironment(companyId, 'test');
```

### Going Live
```typescript
// Switch to production when ready
await switchEnvironment(companyId, 'production');
```

### Troubleshooting
```typescript
// Switch back to test to debug issues
await switchEnvironment(companyId, 'test');
```

## ⚠️ Important Notes

1. **Default Environment**: All companies start in 'test' mode
2. **Migration Required**: Run `npx drizzle-kit push` to add the new column
3. **Fiscal Day Must Be Closed**: Cannot switch with open fiscal day
4. **Production is Permanent**: Production transactions are real and reported to ZIMRA
5. **Separate Devices**: Consider using different device IDs for test vs production

## 🔄 Workflow Example

```
1. Development Phase
   └─ Use Test Environment
      ├─ Register test device
      ├─ Test all features
      └─ Verify fiscalization works

2. Pre-Production
   └─ Close all test fiscal days
      └─ Switch to Production Environment
         └─ Warning displayed

3. Production Phase
   └─ Use Production Environment
      ├─ Register production device
      ├─ Real transactions
      └─ Official ZIMRA reporting

4. If Issues Arise
   └─ Close production fiscal day
      └─ Switch back to Test
         └─ Debug and fix
            └─ Switch to Production again
```

## 📝 Next Steps

1. ✅ Run database migration
2. ✅ Add import to routes.ts
3. ✅ Add environment endpoints
4. ✅ Update all ZimraDevice initializations
5. ✅ Test environment switching
6. ✅ Create UI component for switching
7. ✅ Add to company settings page
8. ✅ Document for users

## 🎨 UI Integration

Add a toggle or dropdown in the company settings:

```tsx
<div className="zimra-environment">
  <label>ZIMRA Environment</label>
  <select 
    value={environment} 
    onChange={handleEnvironmentChange}
    disabled={fiscalDayOpen}
  >
    <option value="test">Test (fdmsapitest.zimra.co.zw)</option>
    <option value="production">Production (fdmsapi.zimra.co.zw)</option>
  </select>
  
  {environment === 'production' && (
    <div className="warning">
      ⚠️ Production mode: All transactions are real
    </div>
  )}
  
  {fiscalDayOpen && (
    <div className="info">
      Close fiscal day to switch environments
    </div>
  )}
</div>
```

## 🐛 Troubleshooting

**Q: Can't switch environments**
- A: Check if fiscal day is open. Close it first.

**Q: Still using test URL after switching**
- A: Verify all ZimraDevice initializations include the baseUrl parameter

**Q: Environment resets after restart**
- A: Check database migration ran successfully

**Q: How to test without affecting production?**
- A: Always use test environment for testing. Only switch to production when ready to go live.

## ✨ Benefits

1. **Flexibility**: Easy switching between test and production
2. **Safety**: Cannot accidentally switch during active fiscal day
3. **Transparency**: Clear indication of current environment
4. **Auditability**: All switches are logged
5. **User-Friendly**: Clear warnings and error messages

---

**Status**: ✅ Ready for Implementation
**Complexity**: Medium
**Time to Implement**: ~30 minutes
**Testing Time**: ~15 minutes
