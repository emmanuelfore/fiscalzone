# Invoice Numbering System - ZIMRA Compliance

## Overview

The ZIMRA-compliant invoicing system uses two distinct numbering schemes to ensure proper fiscal tracking and customer reference management.

## Invoice Number Format

### 1. Invoice No (ZIMRA Fields [17]/[18])
**Format:** `receiptCounter/receiptGlobalNo`  
**Example:** `15/451`

This is the **fiscal receipt number** assigned by the ZIMRA Fiscal Device Management System (FDMS) when an invoice is fiscalized.

#### Components:
- **`receiptCounter` [17]**: Daily receipt counter within the current fiscal day
  - Resets to 1 at the start of each new fiscal day
  - Increments sequentially throughout the fiscal day
  - Example: If today is fiscal day 45 and this is the 15th receipt, `receiptCounter = 15`

- **`receiptGlobalNo` [18]**: Global receipt number (never resets)
  - Increments sequentially across all fiscal days
  - Never resets, ensuring unique identification across the device's lifetime
  - Example: `receiptGlobalNo = 451` means this is the 451st receipt ever issued from this device

#### When is it assigned?
- Assigned automatically during fiscalization (when invoice status changes to "fiscalized")
- Only available after the invoice has been submitted to ZIMRA FDMS
- Before fiscalization, the invoice will show the Customer Reference Number instead

#### Display Logic:
```typescript
Invoice No: receiptCounter/receiptGlobalNo  // If fiscalized
Invoice No: invoiceNumber                    // If not yet fiscalized (fallback)
```

---

### 2. Customer Reference No (ZIMRA Field [20])
**Format:** `PREFIX-XXXXXX` (e.g., `CISN-0000040012`, `INV-001`, `CN-001`)  
**Requirement:** Must be **unique at taxpayer (company) level**

This is the **business reference number** used by your company to track invoices internally.

#### Characteristics:
- **Unique per company**: No two invoices from the same company can have the same Customer Reference Number
- **User-defined format**: Can follow your company's numbering convention
- **Persistent**: Assigned when invoice is created and never changes
- **Used for**: Internal tracking, customer communication, accounting records

#### Default Format:
- **Regular Invoices**: `INV-001`, `INV-002`, etc.
- **Credit Notes**: `CN-001`, `CN-002`, etc.
- **Debit Notes**: `DN-001`, `DN-002`, etc.

#### Custom Format:
You can customize the prefix and numbering format in your company settings. For example:
- `CISN-0000040012` (Customer Invoice Serial Number with zero-padding)
- `2024-INV-001` (Year-prefixed)
- `BRANCH-A-001` (Branch-specific)

---

## How It Works Together

### Invoice Lifecycle:

1. **Draft Stage**
   - Customer Reference No: `INV-001` (assigned immediately)
   - Invoice No: `INV-001` (shows Customer Reference as fallback)

2. **Issued Stage**
   - Customer Reference No: `INV-001` (unchanged)
   - Invoice No: `INV-001` (still shows Customer Reference, not yet fiscalized)

3. **Fiscalized Stage**
   - Customer Reference No: `INV-001` (unchanged)
   - Invoice No: `15/451` (now shows fiscal receipt number from ZIMRA)

### Display on Invoice:

```
Invoice No: 15/451                    ← Fiscal receipt number (if fiscalized)
Customer Reference No: CISN-0000040012 ← Your internal reference (always shown)
```

---

## Database Schema

### Invoice Table Fields:

```sql
invoice_number        TEXT NOT NULL,        -- Customer Reference No [20]
receipt_counter       INTEGER,              -- ZIMRA Field [17]
receipt_global_no     INTEGER,              -- ZIMRA Field [18]
fiscal_day_no         INTEGER,              -- ZIMRA Field [19]
```

### Field Relationships:

- `invoice_number`: Set at invoice creation, unique per company
- `receipt_counter`: Set during fiscalization, resets each fiscal day
- `receipt_global_no`: Set during fiscalization, never resets
- `fiscal_day_no`: Set during fiscalization, tracks which fiscal day

---

## Compliance Requirements

### ZIMRA Field Mapping:

| ZIMRA Field | Description | Database Field | Display Format |
|------------|-------------|----------------|----------------|
| [17] | Receipt Counter | `receipt_counter` | Daily counter (resets) |
| [18] | Receipt Global No | `receipt_global_no` | Global counter (never resets) |
| [19] | Fiscal Day No | `fiscal_day_no` | Current fiscal day number |
| [20] | Customer Reference | `invoice_number` | Unique per company |

### Display Rules:

1. **Invoice No** must show `receiptCounter/receiptGlobalNo` when fiscalized
2. **Customer Reference No** must always be displayed and be unique per company
3. **Fiscal Day No** must be displayed when available
4. **Device Serial No** and **Device ID** must be displayed for fiscalized invoices

---

## Example Scenarios

### Scenario 1: New Invoice
```
Created: 2024-01-15
Customer Reference No: INV-001
Invoice No: INV-001 (not yet fiscalized)
```

### Scenario 2: After Fiscalization
```
Created: 2024-01-15
Fiscalized: 2024-01-15 10:30 AM
Customer Reference No: INV-001
Invoice No: 15/451
Fiscal Day No: 45
```

### Scenario 3: Credit Note
```
Original Invoice: INV-001 (15/451)
Credit Note Created: CN-001
Credit Note Fiscalized: CN-001 (16/452)
Related Invoice: 15/451
```

---

## Implementation Notes

### Automatic Numbering:

The system automatically:
1. Generates unique Customer Reference Numbers using `getNextInvoiceNumber()`
2. Assigns fiscal receipt numbers during fiscalization
3. Manages fiscal day counters and global receipt counters
4. Ensures uniqueness constraints at the database level

### Validation:

- Customer Reference Numbers are validated for uniqueness per company
- Fiscal receipt numbers are assigned by ZIMRA FDMS and cannot be manually set
- The system prevents duplicate Customer Reference Numbers within the same company

---

## Summary

- **Invoice No [17]/[18]**: Fiscal receipt number (`15/451`) - assigned by ZIMRA, resets daily counter + global counter
- **Customer Reference No [20]**: Business reference (`CISN-0000040012`) - unique per company, assigned at creation
- Both numbers serve different purposes and are displayed together on fiscalized invoices
- The Invoice No format ensures ZIMRA compliance, while Customer Reference No ensures internal tracking
