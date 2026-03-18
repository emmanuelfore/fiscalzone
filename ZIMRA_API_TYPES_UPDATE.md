# ZIMRA API TypeScript Interface Updates

## Summary
Updated TypeScript interfaces to fully comply with the ZIMRA FDMS API specification (sections 4.4 and 4.5).

## Changes Made

### 1. Complete Type Definitions (`server/zimra.ts`)

#### New Type Aliases
- `DeviceOperatingMode`: 'Online' | 'Offline'
- `FiscalDayStatus`: 'FiscalDayOpened' | 'FiscalDayClosed' | 'FiscalDayCloseFailed'
- `FiscalDayReconciliationMode`: 'Manual' | 'Automatic'
- `ReceiptType`: 'FISCALINVOICE' | 'CREDITNOTE' | 'DEBITNOTE'

#### Updated Interfaces

**ZimraConfigResponse** (Section 4.4)
- Now includes all mandatory and optional fields per spec:
  - `operationID`, `taxPayerName`, `taxPayerTIN`
  - `vatNumber` (optional - only for VAT payers)
  - `deviceSerialNo`, `deviceBranchName`
  - `deviceBranchAddress`, `deviceBranchContacts` (optional)
  - `deviceOperatingMode`, `taxPayerDayMaxHrs`, `taxpayerDayEndNotificationHrs`
  - `applicableTaxes` (array of ZimraTax)
  - `certificateValidTill`, `qrUrl`
  - Legacy support: `taxLevels`, `deviceModelName`, `deviceModelVersion`

**ZimraStatusResponse** (Section 4.5)
- Now includes all fields per spec:
  - `operationID`, `fiscalDayStatus`
  - `fiscalDayReconciliationMode` (optional)
  - `fiscalDayServerSignature` (optional - SignatureDataEx)
  - `fiscalDayClosed` (optional - DateTime)
  - `fiscalDayClosingErrorCode` (optional)
  - `fiscalDayCounters` (optional - array)
  - `fiscalDayDocumentQuantities` (optional - array)
  - `lastReceiptGlobalNo`, `lastFiscalDayNo` (optional)

**New Supporting Interfaces**
- `ZimraTax`: Tax information with ID, percent, name, validity dates
- `ZimraAddress`: Province, city, street, house number, district
- `ZimraContacts`: Phone and email
- `SignatureDataEx`: Hash and signature
- `FiscalDayCounter`: Counter type, currency, tax info, value
- `FiscalDayDocumentQuantity`: Receipt type, currency, quantity, total amount

### 2. Updated Routes (`server/routes.ts`)

**Config Sync Endpoint** (`/api/companies/:id/zimra/config/sync`)
- Now uses `applicableTaxes` (spec-compliant field)
- Falls back to `taxLevels` for backward compatibility
- Returns comprehensive config information including:
  - Operation ID
  - Taxpayer details (name, TIN, VAT number)
  - Device information
  - Operating mode
  - Certificate validity
  - QR URL
  - Fiscal day settings

## Backward Compatibility

The changes maintain backward compatibility by:
1. Supporting both `applicableTaxes` (new) and `taxLevels` (legacy)
2. Making all optional fields truly optional in TypeScript
3. Keeping existing function signatures intact

## Benefits

1. **Type Safety**: Full TypeScript coverage of all ZIMRA API fields
2. **Spec Compliance**: Matches official FDMS specification exactly
3. **Better Documentation**: Types serve as inline documentation
4. **Error Prevention**: Catches missing/incorrect fields at compile time
5. **IDE Support**: Better autocomplete and IntelliSense

## Testing Recommendations

1. Test config sync with real ZIMRA API
2. Verify all returned fields are properly typed
3. Test both online and offline device modes
4. Verify fiscal day status transitions
5. Test with VAT and non-VAT taxpayers
