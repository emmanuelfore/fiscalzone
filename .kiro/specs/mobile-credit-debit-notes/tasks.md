# Implementation Plan: Mobile Credit & Debit Notes

## Overview

Implement Credit Note and Debit Note issuance in the mobile POS app. Tasks are ordered by dependency so each step is independently deployable without breaking the app. The sequence is: server extension → offline queue → printing → NoteModal UI → ReportsScreen wiring → POSScreen sync → property-based tests.

## Tasks

- [x] 1. Extend server credit-note and debit-note endpoints to accept optional `items` body
  - [x] 1.1 Update `POST /api/invoices/:id/credit-note` in `server/routes.ts`
    - Read `req.body.items`, `req.body.reason`, and `req.body.cashierName`
    - When `items` is provided and non-empty, use it instead of copying from `originalInvoice.items`; compute `subtotal`, `taxAmount`, and `total` from the supplied items
    - Store `reason` in `notes` field and `cashierName` in the invoice payload
    - Keep existing full-copy behaviour when `items` is absent (backward-compatible)
    - _Requirements: 4.1, 8.5, 8.6, 9.3_
  - [x] 1.2 Apply the same change to `POST /api/invoices/:id/debit-note`
    - Mirror the logic from 1.1 exactly
    - _Requirements: 4.2, 8.5, 8.6, 9.3_

- [x] 2. Add Note_Queue functions to `mobile/src/lib/offlineQueue.ts`
  - [x] 2.1 Define `PendingNote` type and add `"pendingNotes"` to the `KEYS` constant
    - Fields: `id`, `companyId`, `originalInvoiceId`, `noteType: "credit" | "debit"`, `payload`, `createdAt`
    - _Requirements: 5.1, 5.7_
  - [x] 2.2 Implement `addPendingNote(companyId, originalInvoiceId, noteType, payload): Promise<string>`
    - Follow the same `readJson` / `writeJson` / `uid()` pattern as `addPendingSale`
    - _Requirements: 5.1_
  - [x] 2.3 Implement `getPendingNotes(companyId): Promise<PendingNote[]>`
    - Filter by `companyId`, same pattern as `getPendingSales`
    - _Requirements: 5.3, 5.7_
  - [x] 2.4 Implement `removePendingNote(id): Promise<void>`
    - Filter-out by `id`, same pattern as `removePendingSale`
    - _Requirements: 5.5_
  - [ ]* 2.5 Write property test for offline note round-trip (Property 6)
    - **Property 6: Offline note survives app restart**
    - **Validates: Requirements 5.1, 5.7**

- [x] 3. Extend printing for note-type receipts in `mobile/src/lib/printing.ts`
  - [ ] 3.1 Add `noteType?: "credit" | "debit"` and `originalInvoiceNumber?: string` to `TicketData` interface
    - _Requirements: 6.2, 6.3_
  - [ ] 3.2 Update `generateReceiptHtml` to use note-specific title and markers when `noteType` is set
    - Title: `"CREDIT NOTE"` / `"DEBIT NOTE"` (fiscal: `"FISCAL CREDIT NOTE"` / `"FISCAL DEBIT NOTE"`)
    - Add `Ref: {originalInvoiceNumber}` line below the invoice number
    - Fiscal footer marker: `"*** FISCAL CREDIT NOTE ***"` or `"*** FISCAL DEBIT NOTE ***"`
    - Offline marker: `"*** PENDING SYNC ***"` (replaces `"*** PENDING FISCALIZATION ***"` for notes)
    - _Requirements: 6.2, 6.3, 6.6, 6.7, 6.7a, 6.8, 7.2_
  - [ ] 3.3 Apply the same conditional logic to `printToBluetooth`
    - Same title, ref line, and footer marker changes as 3.2
    - _Requirements: 6.2, 6.3, 6.7, 6.9, 6.10_
  - [ ]* 3.4 Write property test for receipt type label and ref (Property 7)
    - **Property 7: Note receipt contains type label and original invoice reference**
    - **Validates: Requirements 6.2, 6.3**

- [x] 4. Create `mobile/src/components/NoteModal.tsx`
  - [x] 4.1 Scaffold the component with `NoteModalProps` interface and internal state
    - Props: `visible`, `noteType`, `originalInvoice`, `originalItems`, `companyId`, `company`, `creditThreshold`, `currencySymbol`, `cashierName`, `printerConfig`, `onClose`, `onSuccess`
    - State: `adjustedItems` (array of `{ originalItem, qty, unitPrice }`), `reason`, `isSubmitting`, `showPinModal`, `error`
    - _Requirements: 2.1, 2.9_
  - [x] 4.2 Render the header (note type label + original invoice number + close button) and scrollable item list
    - Each row: description, qty stepper (−/+ buttons clamped 0..originalQty), unit price `TextInput`, computed line total
    - Visually dim rows where `qty === 0` per requirement 2.4
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.9_
  - [x] 4.3 Add the Reason field, running total footer, and Cancel/Confirm buttons
    - `TextInput` with `maxLength={200}` for reason
    - Running total recalculates on every `qty` or `unitPrice` change
    - _Requirements: 2.5, 2.6, 2.7, 2.8_
  - [ ]* 4.4 Write property test for reason 200-char limit (Property 11)
    - **Property 11: Reason field enforces 200-character limit**
    - **Validates: Requirements 2.6**
  - [x] 4.5 Implement Confirm validation (all-zero qty and negative price guards)
    - Show inline `error` string; do not call submit path when invalid
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [ ]* 4.6 Write property test for all-zero-qty rejection (Property 3)
    - **Property 3: All-zero-quantity note is rejected**
    - **Validates: Requirements 8.1, 8.2**
  - [ ]* 4.7 Write property test for negative price rejection (Property 4)
    - **Property 4: Negative unit price is rejected**
    - **Validates: Requirements 8.3, 8.4**
  - [x] 4.8 Implement manager PIN gate for credit notes above threshold
    - Show `ManagerPinModal` (import from `../ui/ManagerPinModal`) when `noteType === "credit"` and `noteTotal > creditThreshold`
    - Verify PIN via `POST /api/companies/:id/auth/verify-manager-pin` before proceeding
    - Debit notes of any amount skip the PIN gate
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 4.9 Write property test for manager PIN threshold (Property 5)
    - **Property 5: Manager PIN required iff credit note total exceeds threshold**
    - **Validates: Requirements 3.1, 3.4, 3.5**
  - [x] 4.10 Implement online submission path
    - Build `payload` preserving `currency`, `exchangeRate`, `taxRate`, `taxTypeId` from original invoice; include only items with `qty > 0`
    - POST to `/api/invoices/:id/credit-note` or `/api/invoices/:id/debit-note`
    - On 201: if fiscal company, call `POST /api/invoices/:noteId/fiscalize`; on fiscalisation failure show warning but keep note success
    - Offer print via `printToBluetooth` or `printReceipt` using the new `noteType` fields
    - Call `onSuccess(note)` and close modal
    - On non-2xx: set `error` from response body, keep modal open
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.5, 8.6, 9.1, 9.3, 10.1, 10.2, 10.3, 6.1_
  - [ ]* 4.11 Write property test for payload financial metadata preservation (Property 8)
    - **Property 8: Note payload preserves original invoice financial metadata**
    - **Validates: Requirements 8.5, 8.6**
  - [ ]* 4.12 Write property test for relatedInvoiceId integrity (Property 9)
    - **Property 9: relatedInvoiceId always equals original invoice ID**
    - **Validates: Requirements 9.1**
  - [ ]* 4.13 Write property test for fiscalisation condition (Property 10)
    - **Property 10: Fiscalisation called iff online and fiscal company**
    - **Validates: Requirements 10.1, 10.4**
  - [x] 4.14 Implement offline submission path
    - Call `addPendingNote(companyId, originalInvoice.id, noteType, payload)`
    - Offer print with `invoice._offline = true` so the `"*** PENDING SYNC ***"` marker appears
    - Call `onSuccess` with a locally constructed note object
    - _Requirements: 5.1, 5.2, 7.1, 7.2, 6.1_

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Wire NoteModal into `mobile/src/screens/ReportsScreen.tsx`
  - [x] 6.1 Add `onCreditNote` and `onDebitNote` props to `ExpandedSaleContent` and render CN/DN buttons
    - Buttons visible only when `sale.status === "issued" || sale.status === "paid"`
    - Sit alongside the existing "Reprint" button in `saleFooter`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ]* 6.2 Write property test for button visibility (Property 1)
    - **Property 1: Button visibility matches invoice status**
    - **Validates: Requirements 1.3, 1.4**
  - [x] 6.3 Add CN/DN type badges to sale list rows in `renderItem`
    - When `sale.transactionType === "CreditNote"`: orange "CN" badge + `Ref: {relatedInvoiceId}` sub-label
    - When `sale.transactionType === "DebitNote"`: purple "DN" badge + `Ref: {relatedInvoiceId}` sub-label
    - _Requirements: 9.2_
  - [x] 6.4 Add `noteModal` state and wire up `NoteModal` component
    - State: `{ visible, noteType, sale, items } | null`
    - Pass `company`, `currencySymbols`, `printerConfig`, `cashierName` (from `userName` prop) to `NoteModal`
    - Load `creditThreshold` from `AsyncStorage` (key `credit_threshold_${companyId}`, default `50`)
    - On `onSuccess`: close modal, optionally refresh sales list
    - _Requirements: 1.2, 3.6_

- [x] 7. Extend `POSScreen.tsx` sync and queue count
  - [x] 7.1 Import `getPendingNotes`, `removePendingNote` from `offlineQueue` in `POSScreen.tsx`
    - _Requirements: 5.4, 5.5_
  - [x] 7.2 Extend `syncQueued` to flush `pendingNotes` after flushing sales
    - For each pending note: POST to the correct endpoint, on success call `removePendingNote`
    - If company is fiscal (`vatRegistered && vatNumber`), call `POST /api/invoices/:noteId/fiscalize` after successful sync
    - On fiscalisation failure: log warning, do not block removal of the note from the queue
    - _Requirements: 5.4, 5.5, 5.6, 10.1, 10.4_
  - [x] 7.3 Extend the `queueCount` polling effect to include `getPendingNotes`
    - `setQueueCount(sales.length + shifts.length + notes.length)`
    - _Requirements: 5.3_

- [ ] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement property-based tests
  - [ ]* 9.1 Write property test for note total ≤ original total (Property 2)
    - **Property 2: Note total never exceeds original invoice total**
    - **Validates: Requirements 2.2, 2.3, 2.5**
    - Use `fc.array(itemArb)` and `adjustmentsArb`; assert `computeNoteTotal(items, adjustments) <= computeOriginalTotal(items) + 0.001`

- [ ] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use **fast-check** with minimum 100 iterations per property
- The `creditThreshold` defaults to `50.00` and is stored in AsyncStorage under `credit_threshold_{companyId}`
- Server changes in task 1 are backward-compatible — existing web-client calls that omit `items` continue to work unchanged
