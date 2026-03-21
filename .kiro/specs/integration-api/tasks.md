# Implementation Plan: Integration API

## Overview

Implement a versioned REST API (`/api/v1/`) in `server/api/v1/` that delegates entirely to the existing `storage` layer and `processInvoiceFiscalization`. No business logic is re-implemented. The existing `routes.ts` is not modified beyond adding one mount line.

## Tasks

- [x] 1. Scaffold `server/api/v1/` directory and shared types
  - Create `server/api/v1/index.ts` — empty v1Router that mounts all sub-routers and exports it
  - Create `server/api/v1/middleware.ts` — stub for `resolveApiKey`
  - Create `server/api/v1/fiscalize.ts`, `invoices.ts`, `customers.ts`, `products.ts`, `fiscal.ts`, `webhooks.ts` — empty Express routers
  - Define shared TypeScript interfaces: `ApiError`, `PassThroughFiscalizeResponse`, `InvoiceResponse`, `FiscalizeResponse`, `CustomerResponse` (can live in `server/api/v1/index.ts` or a `types.ts`)
  - Add one line to `server/routes.ts` (or `server/index.ts`) to mount v1Router: `app.use('/api/v1', v1Router)`
  - _Requirements: 12.1, 12.2_

- [x] 2. Implement `resolveApiKey` middleware
  - [x] 2.1 Implement `resolveApiKey` in `server/api/v1/middleware.ts`
    - Read `X-API-Key` header; call `storage.getCompanyByApiKey(key)`
    - Attach `req.company` on success; respond `401` with `MISSING_API_KEY` or `INVALID_API_KEY` on failure
    - Extend Express `Request` type to include `company` field
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Write property test for `resolveApiKey` (Property 1)
    - **Property 1: Invalid API key always returns 401**
    - **Validates: Requirements 1.3, 1.4**
    - Use fast-check with `numRuns: 100`; generate arbitrary strings that are not valid keys

  - [x] 2.3 Write property test for `resolveApiKey` (Property 2)
    - **Property 2: Valid API key attaches company to request context**
    - **Validates: Requirements 1.2**

- [x] 3. Implement Mode A — Pass-Through Fiscalization (`server/api/v1/fiscalize.ts`)
  - [x] 3.1 Define Zod schema for `PassThroughFiscalizeRequest`
    - Require `items` (non-empty array); each item requires `description`, `quantity` (≥0), `unitPrice` (≥0); optional `taxRate`, `hsCode`, `buyer`, `invoiceNumber`, `date`, `paymentMethod`, `currency`, `notes`, `transactionType`
    - _Requirements: 2.2, 10.1, 10.3, 10.4_

  - [x] 3.2 Implement `POST /api/v1/fiscalize` handler
    - Apply item defaults: `taxRate ?? company.defaultTaxRate ?? 15`, `hsCode ?? company.defaultHsCode ?? "04021099"`
    - Compute `lineTotal`, `subtotal`, `taxAmount`, `total` server-side
    - Build buyer data inline (no `storage.createCustomer()` call)
    - Generate `invoiceNumber` via `storage.nextInvoiceNumber()` if omitted; default `date` to today (Harare), `paymentMethod` to `"CASH"`, `currency` to company default or `"USD"`, `transactionType` to `"FiscalInvoice"`
    - Call `storage.createInvoice()` then `processInvoiceFiscalization()`
    - Respond `200` with `PassThroughFiscalizeResponse`; on fiscalization error respond `422 FISCALIZATION_FAILED`
    - Always take `companyId` from `req.company.id`
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15_

  - [x] 3.3 Write property test for pass-through handler (Property 3)
    - **Property 3: companyId always comes from API key, never from request body**
    - **Validates: Requirements 2.15, 9.1**

  - [x] 3.4 Write property test for pass-through handler (Property 5)
    - **Property 5: Invoice total arithmetic is always correct**
    - **Validates: Requirements 2.11**
    - Generate arbitrary arrays of `{quantity, unitPrice, taxRate}` with fast-check; assert computed totals match formula

  - [x] 3.5 Write property test for pass-through handler (Property 6)
    - **Property 6: Item defaults are applied when optional fields are omitted**
    - **Validates: Requirements 2.3, 2.4**

  - [x] 3.6 Write property test for pass-through handler (Property 7)
    - **Property 7: Buyer info stored inline without creating customer records**
    - **Validates: Requirements 2.5**

  - [x] 3.7 Write property test for pass-through handler (Property 12)
    - **Property 12: Fiscalization failure returns 422 with FISCALIZATION_FAILED**
    - **Validates: Requirements 2.13**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Mode B — Invoice CRUD (`server/api/v1/invoices.ts`)
  - [x] 5.1 Define Zod schema for `CreateInvoiceRequest` and `UpdateInvoiceRequest`
    - Require `items` (non-empty); each item requires `description`, `quantity` (≥0), `unitPrice` (≥0); optional `productId`, `taxRate`, `customerId`, `issueDate`, `paymentMethod`, `notes`, `relatedInvoiceId`, `transactionType`
    - _Requirements: 3.2, 10.1, 10.3, 10.4_

  - [x] 5.2 Implement `POST /api/v1/invoices` — create invoice
    - If item has `productId`, fetch product and use its `taxRate`/`hsCode`; otherwise use item `taxRate ?? company.defaultTaxRate ?? 15`
    - Derive all computed fields server-side; always set `companyId` from `req.company.id`
    - Call `storage.createInvoice()`; respond `201` with `InvoiceResponse`
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6_

  - [x] 5.3 Implement `GET /api/v1/invoices` — list invoices (paginated)
    - Scope to `req.company.id`; support `page`/`limit` query params
    - _Requirements: 3.7_

  - [x] 5.4 Implement `GET /api/v1/invoices/:id` — get single invoice
    - Fetch invoice; assert `companyId` matches; respond `404 NOT_FOUND` if not found or wrong company
    - _Requirements: 3.8, 3.9_

  - [x] 5.5 Implement `PUT /api/v1/invoices/:id` — update draft invoice
    - Assert ownership; reject with `422` if invoice is fiscalized; call `storage.updateInvoice()`
    - _Requirements: 3.10, 3.11_

  - [x] 5.6 Implement `DELETE /api/v1/invoices/:id` — delete draft invoice
    - Assert ownership; reject with `422` if invoice is fiscalized; call `storage.deleteInvoice()`; respond `204`
    - _Requirements: 3.12, 3.13_

  - [x] 5.7 Implement `POST /api/v1/invoices/:id/fiscalize`
    - Fetch invoice; assert ownership; check `fiscalCode` is null (else `409 ALREADY_FISCALIZED`)
    - Delegate to `processInvoiceFiscalization()`; respond `200` with `FiscalizeResponse`; on error `422 FISCALIZATION_FAILED`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.8 Write property test for invoice handlers (Property 3)
    - **Property 3: companyId always comes from API key, never from request body**
    - **Validates: Requirements 3.6, 9.1**

  - [x] 5.9 Write property test for invoice handlers (Property 4)
    - **Property 4: Cross-company resource access always returns 404**
    - **Validates: Requirements 3.9, 4.2, 9.2, 9.3**

  - [x] 5.10 Write property test for invoice handlers (Property 5)
    - **Property 5: Invoice total arithmetic is always correct**
    - **Validates: Requirements 3.5**

  - [x] 5.11 Write property test for invoice handlers (Property 10)
    - **Property 10: productId causes tax and HS code to be pulled from product record**
    - **Validates: Requirements 3.3**

  - [x] 5.12 Write property test for invoice fiscalize handler (Property 11)
    - **Property 11: Re-fiscalizing an already-fiscalized invoice returns 409**
    - **Validates: Requirements 4.3**

  - [x] 5.13 Write property test for invoice fiscalize handler (Property 12)
    - **Property 12: Fiscalization failure returns 422 with FISCALIZATION_FAILED**
    - **Validates: Requirements 4.4**

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Customer CRUD (`server/api/v1/customers.ts`)
  - [x] 7.1 Define Zod schema for `CustomerRequest`
    - Require `name`; optional `email`, `phone`, `address`, `vatNumber`, `tin`
    - _Requirements: 5.2, 10.1_

  - [x] 7.2 Implement `POST /api/v1/customers`, `GET /api/v1/customers`, `GET /api/v1/customers/:id`, `PUT /api/v1/customers/:id`
    - All operations scoped to `req.company.id`; assert ownership on single-resource endpoints; respond `404 NOT_FOUND` if not found or wrong company
    - Delegate to `storage.createCustomer()`, `storage.getCustomers()`, `storage.getCustomer()`, `storage.updateCustomer()`
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 7.3 Write property test for customer handlers (Property 3)
    - **Property 3: companyId always comes from API key, never from request body**
    - **Validates: Requirements 9.1**

  - [x] 7.4 Write property test for customer handlers (Property 4)
    - **Property 4: Cross-company resource access always returns 404**
    - **Validates: Requirements 5.5, 9.2, 9.3**

- [x] 8. Implement Product CRUD (`server/api/v1/products.ts`)
  - [x] 8.1 Define Zod schema for `ProductRequest`
    - Numeric fields `price`, `taxRate`, etc. must be non-negative
    - _Requirements: 10.1_

  - [x] 8.2 Implement `POST /api/v1/products`, `GET /api/v1/products`, `PUT /api/v1/products/:id`
    - All operations scoped to `req.company.id`; assert ownership on single-resource endpoints; respond `404 NOT_FOUND`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.3 Write property test for product handlers (Property 4)
    - **Property 4: Cross-company resource access always returns 404**
    - **Validates: Requirements 6.5, 9.2, 9.3**

- [x] 9. Implement Fiscal Router (`server/api/v1/fiscal.ts`)
  - [x] 9.1 Define Zod schemas for day open/close if needed
  - [x] 9.2 Implement `GET /api/v1/fiscal/device`
    - _Requirements: 7.1_
  - [x] 9.3 Implement `POST /api/v1/fiscal/ping`
    - _Requirements: 7.2_
  - [x] 9.4 Implement `POST /api/v1/fiscal/open-day`
    - _Requirements: 8.1_
  - [x] 9.5 Implement `POST /api/v1/fiscal/close-day`
    - _Requirements: 8.2_
  - [x] 9.6 Write property test for fiscal handlers (Property 4)
    - **Property 4: Cross-company resource access always returns 404**
    - **Validates: Requirements 9.2, 9.3**

- [x] 10. Implement Webhooks Router (`server/api/v1/webhooks.ts`)
  - [x] 10.1 `POST /api/v1/webhooks/sage`
    - Mount the Sage webhook router here, or delegate payload.
    - _Requirements: 11.2_

- [x] 11. Implement consistent error handling and Zod validation middleware
  - Can be a middleware or explicit try/catch in every handler ensuring `ApiError` shapes (`400 VALIDATION_ERROR`, `401 UNAUTHORIZED`, `404 NOT_FOUND`, `409 ALREADY_FISCALIZED`, `422 FISCALIZATION_FAILED`, `500 INTERNAL_ERROR`).
  - _Requirements: Section 4_

- [x] 12. Final checkpoint
  - Review implementation against requirements
  - Notify user of completion. `{ error, message, statusCode }`
  - _Requirements: 10.2, 11.1, 11.2, 11.3, 11.4_

  - [ ] 11.1 Write property test for error format (Property 8)
    - **Property 8: Validation errors return 400 with a details array**
    - **Validates: Requirements 10.2, 10.3, 10.4**

  - [ ] 11.2 Write property test for error format (Property 9)
    - **Property 9: All error responses follow the standard shape**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- All property-based tests use fast-check with `numRuns: 100`
- `companyId` is always sourced from `req.company.id` — never from request body
- The existing `routes.ts` is not modified beyond the single mount line added in task 1
- All handlers delegate to `storage.*` and `processInvoiceFiscalization` — no business logic re-implemented
