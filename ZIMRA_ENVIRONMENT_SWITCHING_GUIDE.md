# ZIMRA Environment Switching - Implementation Guide

## Overview
This guide explains how to implement test/production environment switching for ZIMRA FDMS integration.

## Changes Made

### 1. Schema Update (`shared/schema.ts`)
Added `zimraEnvironment` field to companies table:
```typescript
zimraEnvironment: text("zimra_environment").default("test"), // 'test' or 'production'
```

### 2. Helper Function (`server/zimra.ts`)
Added utility function to get the correct base URL:
```typescript
export function getZimraBaseUrl(environment: 'test' | 'production' = 'test'): string {
    return environment === 'production' ? ZIMRA_PROD_URL : ZIMRA_TEST_URL;
}
```

### 3. New Endpoints
Two new endpoints for environment management (see `server/zimra-environment-endpoints.ts`):

#### POST `/api/companies/:id/zimra/environment`
Switch between test and production environments

**Request:**
```json
{
  "environment": "production"  // or "test"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "ZIMRA environment switched to production",
  "previousEnvironment": "test",
  "currentEnvironment": "production",
  "baseUrl": "https://fdmsapi.zimra.co.zw",
  "warning": "You are now using the PRODUCTION ZIMRA environment..."
}
```

**Response (Error - Fiscal Day Open):**
```json
{
  "message": "Cannot switch environment while fiscal day is open",
  "suggestion": "Close the current fiscal day before switching environments",
  "currentEnvironment": "test",
  "fiscalDayNo": 5
}
```

#### GET `/api/companies/:id/zimra/environment`
Get current environment status

**Response:**
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

## Implementation Steps

### Step 1: Run Database Migration
```bash
npx drizzle-kit push
```
This will add the `zimra_environment` column to the companies table.

### Step 2: Add Environment Endpoints
Add the code from `server/zimra-environment-endpoints.ts` to `server/routes.ts` after line 74 (after the company update endpoint).

### Step 3: Update ZimraDevice Initializations
Find all places where `new ZimraDevice()` is called and update to use the company's environment.

**Before:**
```typescript
const device = new ZimraDevice({
  deviceId: company.fdmsDeviceId,
  deviceSerialNo: "UNKNOWN",
  activationKey: company.fdmsApiKey || "",
  privateKey: company.zimraPrivateKey || "",
  certificate: company.zimraCertificate || "",
});
```

**After:**
```typescript
import { getZimraBaseUrl } from "./zimra";

const device = new ZimraDevice({
  deviceId: company.fdmsDeviceId,
  deviceSerialNo: "UNKNOWN",
  activationKey: company.fdmsApiKey || "",
  privateKey: company.zimraPrivateKey || "",
  certificate: company.zimraCertificate || "",
  baseUrl: getZimraBaseUrl(company.zimraEnvironment as 'test' | 'production')
});
```

### Step 4: Update All Endpoints
Update these endpoints in `routes.ts`:

1. `/api/companies/:id/zimra/register` (line ~90)
2. `/api/companies/:id/zimra/verify-taxpayer` (line ~128)
3. `/api/companies/:id/zimra/issue-certificate` (line ~154)
4. `/api/companies/:id/zimra/server-certificate` (line ~195)
5. `/api/companies/:id/zimra/status` (line ~357)
6. `/api/companies/:id/zimra/config/sync` (line ~393)
7. `/api/companies/:id/zimra/ping` (line ~438)
8. `/api/companies/:id/zimra/day/open` (line ~474)
9. `/api/companies/:id/zimra/day/close` (line ~536)
10. `/api/invoices/:id/fiscalize` (line ~721)

## Safety Features

### 1. Fiscal Day Check
Cannot switch environments while a fiscal day is open:
- Prevents data inconsistency
- Ensures all transactions for a day use the same environment
- User must close fiscal day first

### 2. Production Warning
When switching to production:
- Logs a warning to console
- Returns a warning message in response
- Alerts user that transactions will be real

### 3. Environment Validation
- Only accepts 'test' or 'production'
- Returns 400 error for invalid values

## Usage Examples

### Frontend Integration

```typescript
// Check current environment
const checkEnvironment = async (companyId: number) => {
  const response = await fetch(`/api/companies/${companyId}/zimra/environment`);
  const data = await response.json();
  console.log(`Current environment: ${data.environment}`);
  console.log(`Can switch: ${data.canSwitch}`);
  return data;
};

// Switch to production
const switchToProduction = async (companyId: number) => {
  const response = await fetch(`/api/companies/${companyId}/zimra/environment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ environment: 'production' })
  });
  
  const data = await response.json();
  
  if (data.warning) {
    // Show warning to user
    alert(data.warning);
  }
  
  return data;
};

// Switch to test
const switchToTest = async (companyId: number) => {
  const response = await fetch(`/api/companies/${companyId}/zimra/environment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ environment: 'test' })
  });
  
  return await response.json();
};
```

### UI Component Example

```tsx
function ZimraEnvironmentSwitcher({ companyId }: { companyId: number }) {
  const [environment, setEnvironment] = useState<'test' | 'production'>('test');
  const [canSwitch, setCanSwitch] = useState(true);
  const [fiscalDayOpen, setFiscalDayOpen] = useState(false);

  useEffect(() => {
    // Load current environment
    fetch(`/api/companies/${companyId}/zimra/environment`)
      .then(res => res.json())
      .then(data => {
        setEnvironment(data.environment);
        setCanSwitch(data.canSwitch);
        setFiscalDayOpen(data.fiscalDayOpen);
      });
  }, [companyId]);

  const handleSwitch = async (newEnv: 'test' | 'production') => {
    if (newEnv === 'production') {
      const confirmed = confirm(
        'Are you sure you want to switch to PRODUCTION? ' +
        'All transactions will be real and reported to ZIMRA.'
      );
      if (!confirmed) return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}/zimra/environment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: newEnv })
      });

      const data = await response.json();
      
      if (response.ok) {
        setEnvironment(newEnv);
        alert(data.message);
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('Failed to switch environment');
    }
  };

  return (
    <div className="zimra-environment-switcher">
      <h3>ZIMRA Environment</h3>
      <div className="current-env">
        Current: <strong>{environment.toUpperCase()}</strong>
        {environment === 'production' && <span className="badge-prod">LIVE</span>}
      </div>
      
      {fiscalDayOpen && (
        <div className="warning">
          Cannot switch: Fiscal day is open. Close it first.
        </div>
      )}
      
      <div className="switch-buttons">
        <button 
          onClick={() => handleSwitch('test')}
          disabled={!canSwitch || environment === 'test'}
        >
          Switch to Test
        </button>
        <button 
          onClick={() => handleSwitch('production')}
          disabled={!canSwitch || environment === 'production'}
          className="btn-danger"
        >
          Switch to Production
        </button>
      </div>
    </div>
  );
}
```

## Testing Checklist

- [ ] Database migration successful
- [ ] Can get current environment status
- [ ] Can switch from test to production
- [ ] Can switch from production to test
- [ ] Cannot switch with fiscal day open
- [ ] Warning shown when switching to production
- [ ] All ZIMRA API calls use correct base URL
- [ ] Test environment uses `fdmsapitest.zimra.co.zw`
- [ ] Production environment uses `fdmsapi.zimra.co.zw`
- [ ] Environment persists across server restarts

## Security Considerations

1. **Access Control**: Only authorized users (owners/admins) should be able to switch environments
2. **Audit Logging**: Log all environment switches with user ID and timestamp
3. **Confirmation Required**: Require explicit confirmation for production switch
4. **Fiscal Day Protection**: Enforce fiscal day closure before switching

## Migration Path

### For Existing Companies
All existing companies will default to 'test' environment. To move to production:

1. Ensure fiscal day is closed
2. Call the switch endpoint
3. Verify new environment is active
4. Test with a ping or status check
5. Open new fiscal day in production

## Troubleshooting

**Problem**: "Cannot switch environment while fiscal day is open"
- **Solution**: Close the current fiscal day first using `/api/companies/:id/zimra/day/close`

**Problem**: API calls still going to test environment after switch
- **Solution**: Verify all ZimraDevice initializations include `baseUrl: getZimraBaseUrl(company.zimraEnvironment)`

**Problem**: Environment resets to test after server restart
- **Solution**: Check database - the zimraEnvironment field should persist. Run migration if column is missing.

## Future Enhancements

Consider adding:
- Environment-specific device IDs (separate test and production devices)
- Automatic environment detection based on device ID
- Environment-specific certificates
- Audit trail table for environment switches
- Role-based permissions for environment switching
- Scheduled environment switches
- Environment-specific fiscal day counters
