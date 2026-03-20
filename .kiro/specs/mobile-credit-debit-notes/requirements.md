# Requirements Document

## Introduction

This feature adds Credit Note and Debit Note issuance to the mobile POS app (React Native / Expo). Cashiers can issue a credit note against a completed sale to process a return or refund, or issue a debit note to correct an undercharge. Both note types are initiated from the ReportsScreen by expanding an existing sale, adjusting line items or amounts in a modal, and confirming. The resulting note is created via the existing backend endpoints and a receipt is printed. Notes must queue offline when connectivity is unavailable, and credit notes above a configurable threshold require a manager PIN override — consistent with the existing discount override pattern.

---

## Glossary

- **Credit_Note**: A document that reduces the amount owed by a customer, used for returns or overcharge corrections. Maps to `transactionType = "CreditNote"` on the backend.
- **Debit_Note**: A document that increases the amount owed by a customer, used to correct an undercharge on a completed sale. Maps to `transactionType = "DebitNote"`.
- **Original_Invoice**: The previously issued or paid POS invoice against which a Credit_Note or Debit_Note is being raised.
- **Note_Modal**: The full-screen modal that opens when a cashier initiates a Credit_Note or Debit_Note, showing the Original_Invoice line items for adjustment.
- **Note_Queue**: The AsyncStorage-backed offline queue that stores pending Credit_Note and Debit_Note creation requests when the device is offline, analogous to the existing `pendingSales` queue.
- **Manager_PIN**: A numeric PIN verified against `/api/companies/:id/auth/verify-manager-pin`, used to authorise actions that exceed a threshold.
- **Credit_Threshold**: A company-level or app-level configurable monetary value above which a Credit_Note requires Manager_PIN authorisation.
- **Fiscal_Company**: A company where `vatRegistered === true` and `vatNumber` is set. Receipts for Fiscal_Companies must include fiscal markers and tax tables.
- **Non_Fiscal_Company**: A company where `vatRegistered` is false or `vatNumber` is absent. Receipts are plain without fiscal fields.
- **Note_Receipt**: The printed or previewed receipt for a Credit_Note or Debit_Note, clearly identifying the note type and the Original_Invoice number.
- **POS_App**: The React Native (Expo) mobile point-of-sale application.
- **ReportsScreen**: The `ReportsScreen.tsx` screen that displays sales history and serves as the primary entry point for note issuance.
- **ExpandedSaleRow**: The expanded view of a sale row in ReportsScreen that shows line items and action buttons.
- **Sync_Service**: The background process (mirroring `syncQueued` in POSScreen) that flushes the Note_Queue when connectivity is restored.

---

## Requirements

### Requirement 1: Entry Point — Initiate Note from Sale History

**User Story:** As a cashier, I want to tap a "Credit Note" or "Debit Note" button on an expanded sale in the Reports screen, so that I can start the note issuance process against the correct Original_Invoice.

#### Acceptance Criteria

1. WHEN a cashier expands a sale row in ReportsScreen, THE ExpandedSaleRow SHALL display a "Credit Note" button and a "Debit Note" button alongside the existing "Reprint" button.
2. WHEN the cashier taps "Credit Note" or "Debit Note", THE POS_App SHALL open the Note_Modal pre-populated with the line items of the Original_Invoice.
3. THE ExpandedSaleRow SHALL only display the "Credit Note" and "Debit Note" buttons for invoices whose status is `"issued"` or `"paid"`.
4. IF the Original_Invoice status is `"draft"` or `"cancelled"`, THEN THE ExpandedSaleRow SHALL hide the "Credit Note" and "Debit Note" buttons for that sale.

---

### Requirement 2: Note Modal — Item Review and Adjustment

**User Story:** As a cashier, I want to review and adjust the line items of the original sale inside the Note_Modal, so that I can issue a partial return or a targeted price adjustment.

#### Acceptance Criteria

1. WHEN the Note_Modal opens, THE Note_Modal SHALL display each line item from the Original_Invoice with its description, unit price, original quantity, and line total.
2. THE Note_Modal SHALL allow the cashier to adjust the quantity of each line item to any value between `0` and the original quantity (inclusive).
3. THE Note_Modal SHALL allow the cashier to adjust the unit price of each line item to any non-negative value.
4. WHEN a line item quantity is set to `0`, THE Note_Modal SHALL visually indicate that item is excluded from the note.
5. THE Note_Modal SHALL display a running total that updates in real time as quantities or prices are changed.
6. THE Note_Modal SHALL display a "Reason" text field where the cashier can enter a free-text reason for the note (optional, max 200 characters).
7. THE Note_Modal SHALL display a "Confirm" button and a "Cancel" button.
8. WHEN the cashier taps "Cancel", THE Note_Modal SHALL close without creating any note.
9. THE Note_Modal SHALL display the note type ("Credit Note" or "Debit Note") and the Original_Invoice number in its header.

---

### Requirement 3: Manager PIN Override for High-Value Credit Notes

**User Story:** As a manager, I want credit notes above a configurable threshold to require my PIN, so that large refunds cannot be issued without authorisation.

#### Acceptance Criteria

1. WHEN the cashier taps "Confirm" in the Note_Modal for a Credit_Note whose total exceeds the Credit_Threshold, THE POS_App SHALL present the Manager_PIN modal before proceeding.
2. WHEN the Manager_PIN modal is presented, THE POS_App SHALL not create the Credit_Note until a valid PIN is entered and verified via `/api/companies/:id/auth/verify-manager-pin`.
3. IF the PIN verification fails, THEN THE POS_App SHALL display an error message and allow the cashier to retry or cancel.
4. WHEN the cashier taps "Confirm" for a Debit_Note of any amount, THE POS_App SHALL not require a Manager_PIN.
5. WHEN the cashier taps "Confirm" for a Credit_Note whose total is less than or equal to the Credit_Threshold, THE POS_App SHALL not require a Manager_PIN.
6. THE Credit_Threshold SHALL default to `50.00` in the base currency and SHALL be configurable in the POS printer/settings screen.

---

### Requirement 4: Note Creation — Online Path

**User Story:** As a cashier, I want the note to be created immediately when the device is online, so that the customer's account is updated in real time.

#### Acceptance Criteria

1. WHEN the cashier confirms a Credit_Note and the device is online, THE POS_App SHALL POST to `/api/invoices/:id/credit-note` with the adjusted items and quantities.
2. WHEN the cashier confirms a Debit_Note and the device is online, THE POS_App SHALL POST to `/api/invoices/:id/debit-note` with the adjusted items and quantities.
3. WHEN the backend returns a `201` response, THE POS_App SHALL close the Note_Modal and display a success confirmation.
4. IF the backend returns a non-`2xx` response, THEN THE POS_App SHALL display the error message from the response body and keep the Note_Modal open so the cashier can retry or cancel.
5. WHEN the note is successfully created online, THE POS_App SHALL offer to print the Note_Receipt immediately.

---

### Requirement 5: Note Creation — Offline Queue

**User Story:** As a cashier, I want to issue a note even when the device has no internet connection, so that I can serve customers without interruption.

#### Acceptance Criteria

1. WHEN the cashier confirms a note and the device is offline, THE POS_App SHALL add the note creation request to the Note_Queue in AsyncStorage.
2. WHEN a note is queued offline, THE POS_App SHALL close the Note_Modal and display a confirmation indicating the note is pending sync.
3. WHILE a note is in the Note_Queue, THE POS_App SHALL display the pending count in the sync indicator consistent with the existing queued sales display.
4. WHEN the device comes back online, THE Sync_Service SHALL attempt to flush all pending Note_Queue entries by calling the appropriate backend endpoint for each.
5. WHEN a queued note is successfully synced, THE Sync_Service SHALL remove it from the Note_Queue.
6. IF a queued note fails to sync after the device comes online, THEN THE Sync_Service SHALL retain it in the Note_Queue and retry on the next sync cycle.
7. THE Note_Queue SHALL persist across app restarts using AsyncStorage.

---

### Requirement 6: Note Receipt Printing

**User Story:** As a cashier, I want to print a receipt for the credit or debit note, so that the customer has a physical record of the transaction.

#### Acceptance Criteria

1. WHEN a note is successfully created (online or queued offline), THE POS_App SHALL offer the cashier the option to print a Note_Receipt.
2. THE Note_Receipt SHALL include the note type label ("CREDIT NOTE" or "DEBIT NOTE") prominently in the header.
3. THE Note_Receipt SHALL include the Original_Invoice number as a reference field (e.g. "Ref: INV-0042").
4. THE Note_Receipt SHALL include the adjusted line items, quantities, unit prices, and line totals.
5. THE Note_Receipt SHALL include the note total.
6. WHERE the company is a Fiscal_Company, THE Note_Receipt SHALL include the tax table section with net, VAT, and gross amounts per tax code.
7. WHERE the company is a Fiscal_Company and the note has been fiscalised, THE Note_Receipt SHALL include the fiscal marker "*** FISCAL CREDIT NOTE ***" for Credit_Notes and "*** FISCAL DEBIT NOTE ***" for Debit_Notes.
7a. WHERE the company is a Fiscal_Company and the note is pending fiscalisation, THE Note_Receipt SHALL include a "PENDING FISCALIZATION" marker in place of the fiscal marker.
8. WHERE the company is a Non_Fiscal_Company, THE Note_Receipt SHALL omit fiscal fields and markers.
9. WHEN the device has a configured Bluetooth printer address, THE POS_App SHALL print the Note_Receipt via the thermal Bluetooth printer.
10. WHEN no Bluetooth printer address is configured, THE POS_App SHALL use the standard system print dialog.
11. WHEN a note was queued offline and has not yet synced, THE Note_Receipt SHALL include a "PENDING SYNC" marker consistent with the existing offline receipt marker.

---

### Requirement 7: Offline Note Receipt for Unsynced Notes

**User Story:** As a cashier, I want to print a receipt for an offline-queued note immediately after issuing it, so that the customer does not have to wait for connectivity.

#### Acceptance Criteria

1. WHEN a note is added to the Note_Queue, THE POS_App SHALL construct a local Note_Receipt using the adjusted items and the locally generated note reference.
2. THE Note_Receipt for an offline note SHALL display a "PENDING SYNC" watermark or footer line.
3. WHEN the offline note is later synced and the backend assigns a permanent invoice number, THE POS_App SHALL update the stored note record with the server-assigned number.

---

### Requirement 8: Data Integrity and Validation

**User Story:** As a system, I want note creation to be validated before submission, so that invalid notes are never sent to the backend.

#### Acceptance Criteria

1. WHEN the cashier taps "Confirm", THE Note_Modal SHALL validate that at least one line item has a quantity greater than `0`.
2. IF all line item quantities are `0`, THEN THE Note_Modal SHALL display a validation error and SHALL NOT submit the note.
3. WHEN the cashier taps "Confirm", THE Note_Modal SHALL validate that all adjusted unit prices are non-negative numbers.
4. IF any unit price is negative, THEN THE Note_Modal SHALL display a validation error and SHALL NOT submit the note.
5. THE POS_App SHALL preserve the original currency and exchange rate of the Original_Invoice when creating the note.
6. THE POS_App SHALL preserve the original tax rates and tax type IDs of each line item when creating the note.

---

### Requirement 10: Fiscalisation of Notes for VAT-Registered Companies

**User Story:** As a cashier at a VAT-registered company, I want credit and debit notes to be fiscalised automatically after creation, so that the notes comply with fiscal requirements just like invoices on the web client.

#### Acceptance Criteria

1. WHEN a note (Credit_Note or Debit_Note) is successfully created online AND the company is a Fiscal_Company (`vatRegistered === true` and `vatNumber` is set), THE POS_App SHALL immediately call `POST /api/invoices/:noteId/fiscalize` to submit the note for fiscalisation.
2. WHEN fiscalisation succeeds, THE POS_App SHALL use the fiscalised note data (including `fiscalCode`, `qrCodeData`, and `verificationCode`) when printing the Note_Receipt.
3. IF fiscalisation fails, THEN THE POS_App SHALL display a success confirmation for the note creation and SHALL display a warning indicating that fiscalisation failed, and SHALL allow the cashier to retry fiscalisation.
4. WHEN a note is queued offline (device is offline), THE POS_App SHALL NOT attempt fiscalisation at queue time — fiscalisation SHALL be triggered after the note syncs online, consistent with the existing offline sale sync pattern.
5. THE Note_Receipt for a fiscalised note SHALL include the fiscal marker "*** FISCAL CREDIT NOTE ***" for Credit_Notes and "*** FISCAL DEBIT NOTE ***" for Debit_Notes.
6. THE Note_Receipt for a note pending fiscalisation SHALL include a "PENDING FISCALIZATION" marker.

---

### Requirement 9: Audit and Traceability

**User Story:** As a manager, I want every note to reference its Original_Invoice, so that I can trace refunds and adjustments back to the original sale.

#### Acceptance Criteria

1. THE POS_App SHALL include the `relatedInvoiceId` (the Original_Invoice's ID) in every note creation request sent to the backend.
2. WHEN a note is displayed in the ReportsScreen sales list, THE POS_App SHALL show the note type badge ("CN" or "DN") and the Original_Invoice number as a sub-label.
3. THE POS_App SHALL include the cashier's name in the note creation payload so the note is attributed to the issuing cashier.
