# Requirements Document

## Introduction

The Integration API exposes FiscalStack's core capabilities — invoicing, fiscalization, customer management, product management, and fiscal device status — to external systems such as Sage, QuickBooks, and custom ERPs via a versioned REST interface (`/api/v1/`). It supports two integration modes: Mode A (pass-through fiscalization, where the client owns their own data and sends everything inline) and Mode B (managed fiscalization, where the client uses FiscalStack customer and product records). All business logic delegates to the existing `storage` layer and `processInvoiceFiscalization` function.

## Glossary

- **API**: The Integration API exposed at `/api/v1/`
- **API_Key_Middleware**: The `resolveApiKey` Express middleware that authenticates requests
- **Pass_Through_Handler**: The handler for `POST /api/v1/fiscalize` (Mode A)
- **Invoice_Router**: The Express router handling `/api/v1/invoices` endpoints (Mode B)
- **Customer_Router**: The Express router handling `/api/v1/customers` endpoints
- **Product_Router**: The Express router handling `/api/v1/products` endpoints
- **Fiscal_Router**: The Express router handling `/api/v1/fiscal` endpoints
- **Webhook_Router**: The Express router handling `/api/v1/webhooks` endpoints
- **Storage**: The `DatabaseStorage` / `IStorage` layer (`server/storage.ts`)
- **Fiscalization**: The `processInvoiceFiscalization` function in `server/lib/fiscalization.ts`
- **Company**: A tenant record resolved from an API key
- **Mode_A**: Pass-through fiscalization — client sends inline data, no pre-registered customers or products required
- **Mode_B**: Managed fiscalization — client references FiscalStack customer and product IDs
- **ZIMRA**: Zimbabwe Revenue Authority fiscal device gateway
- **Draft_Invoice**: An invoice with status `pending` that has not yet been fiscalized
- **Fiscalized_Invoice**: An invoice that has a non-null `fiscalCode`

---

## Requirements

### Requirement 1: API Key Authentication

**User Story:** As an external system integrator, I want to authenticate using an API key header, so that I can securely access FiscalStack capabilities without managing user sessions.

#### Acceptance Criteria

1. WHEN a request arrives at any `/api/v1/` endpoint, THE API_Key_Middleware SHALL read the `X-API-Key` request header to identify the caller
2. WHEN the `X-API-Key` header is present and matches a company record, THE API_Key_Middleware SHALL attach the resolved company to the request context and call the next handler
3. IF the `X-API-Key` header is absent, THEN THE API_Key_Middleware SHALL respond with HTTP 401 and error code `MISSING_API_KEY`
4. IF the `X-API-Key` header is present but does not match any company record, THEN THE API_Key_Middleware SHALL respond with HTTP 401 and error code `INVALID_API_KEY`
5. THE API_Key_Middleware SHALL resolve the company by calling `Storage.getCompanyByApiKey()` and SHALL NOT re-implement company lookup logic
6. THE Webhook_Router SHALL be exempt from API key authentication and SHALL use its own per-provider signature verification

---

### Requirement 2: Mode A — Pass-Through Fiscalization

**User Story:** As an external ERP or POS system operator, I want to send raw invoice data inline and receive a fiscal receipt in a single call, so that I can fiscalize transactions without pre-registering customers or products in FiscalStack.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/fiscalize` request is received with a valid API key and a non-empty `items` array, THE Pass_Through_Handler SHALL create an invoice record and fiscalize it atomically in a single operation
2. THE Pass_Through_Handler SHALL require each item to include `description`, `quantity`, and `unitPrice`, and SHALL reject requests missing any of these fields with HTTP 400 and error code `VALIDATION_ERROR`
3. WHEN an item does not include a `taxRate`, THE Pass_Through_Handler SHALL default the item's tax rate to the company's default tax rate, falling back to 15% if no company default is configured
4. WHEN an item does not include an `hsCode`, THE Pass_Through_Handler SHALL default the item's HS code to the company's default HS code, falling back to `"04021099"` if no company default is configured
5. WHEN the request includes a `buyer` object, THE Pass_Through_Handler SHALL include the buyer's name, VAT number, and TIN in the invoice record without creating a customer record in Storage
6. WHEN the request omits `invoiceNumber`, THE Pass_Through_Handler SHALL generate an invoice number via `Storage.nextInvoiceNumber()`
7. WHEN the request omits `date`, THE Pass_Through_Handler SHALL use the current date in Harare local time
8. WHEN the request omits `paymentMethod`, THE Pass_Through_Handler SHALL default to `"CASH"`
9. WHEN the request omits `currency`, THE Pass_Through_Handler SHALL use the company's configured currency, falling back to `"USD"`
10. WHEN the request omits `transactionType`, THE Pass_Through_Handler SHALL default to `"FiscalInvoice"`
11. THE Pass_Through_Handler SHALL compute `lineTotal` as `quantity × unitPrice` for each item, `subtotal` as the sum of all line totals, `taxAmount` as the sum of each item's `lineTotal × taxRate / 100`, and `total` as `subtotal + taxAmount`
12. WHEN fiscalization succeeds, THE Pass_Through_Handler SHALL respond with HTTP 200 containing `fiscalCode`, `qrCodeData`, `receiptGlobalNo`, `receiptCounter`, `fiscalDayNo`, `invoiceNumber`, `total`, and `date`
13. IF fiscalization fails, THEN THE Pass_Through_Handler SHALL respond with HTTP 422 and error code `FISCALIZATION_FAILED` with the ZIMRA error message
14. THE Pass_Through_Handler SHALL delegate fiscalization exclusively to `Fiscalization.processInvoiceFiscalization()` and SHALL NOT re-implement any ZIMRA communication logic
15. THE Pass_Through_Handler SHALL always set `companyId` from the authenticated company context and SHALL NOT accept a `companyId` from the request body

---

### Requirement 3: Mode B — Invoice CRUD

**User Story:** As an external system using FiscalStack as its primary invoicing system, I want to create, read, update, and delete invoices programmatically, so that I can manage the full invoice lifecycle via API.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/invoices` request is received with a valid API key and a non-empty `items` array, THE Invoice_Router SHALL create an invoice via `Storage.createInvoice()` and respond with HTTP 201 and the full `InvoiceResponse`
2. THE Invoice_Router SHALL require each item to include `description`, `quantity`, and `unitPrice`, and SHALL reject requests missing any of these fields with HTTP 400 and error code `VALIDATION_ERROR`
3. WHEN an item includes a `productId`, THE Invoice_Router SHALL retrieve the product from Storage and use its `taxRate` and `hsCode` values for that line item
4. WHEN an item does not include a `productId`, THE Invoice_Router SHALL use the item's supplied `taxRate`, falling back to the company's default tax rate
5. THE Invoice_Router SHALL derive `invoiceNumber`, `dueDate`, `currency`, `taxInclusive`, `lineTotal`, `subtotal`, `taxAmount`, and `total` server-side and SHALL NOT accept these computed fields from the request body
6. THE Invoice_Router SHALL always set `companyId` from the authenticated company context and SHALL NOT accept a `companyId` from the request body
7. WHEN a `GET /api/v1/invoices` request is received, THE Invoice_Router SHALL return a paginated list of invoices belonging to the authenticated company
8. WHEN a `GET /api/v1/invoices/:id` request is received, THE Invoice_Router SHALL return the invoice with its line items if it belongs to the authenticated company
9. IF a requested invoice does not exist or belongs to a different company, THEN THE Invoice_Router SHALL respond with HTTP 404 and error code `NOT_FOUND`
10. WHEN a `PUT /api/v1/invoices/:id` request is received for a draft invoice belonging to the authenticated company, THE Invoice_Router SHALL update the invoice via Storage and respond with the updated `InvoiceResponse`
11. IF a `PUT /api/v1/invoices/:id` request targets a fiscalized invoice, THEN THE Invoice_Router SHALL respond with HTTP 422 and an appropriate error code
12. WHEN a `DELETE /api/v1/invoices/:id` request is received for a draft invoice belonging to the authenticated company, THE Invoice_Router SHALL delete the invoice via Storage and respond with HTTP 204
13. IF a `DELETE /api/v1/invoices/:id` request targets a fiscalized invoice, THEN THE Invoice_Router SHALL respond with HTTP 422 and an appropriate error code

---

### Requirement 4: Mode B — Invoice Fiscalization

**User Story:** As an external system operator, I want to fiscalize a previously created invoice by ID, so that I can submit it to ZIMRA and receive a fiscal receipt.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/invoices/:id/fiscalize` request is received for an invoice belonging to the authenticated company, THE Invoice_Router SHALL delegate to `Fiscalization.processInvoiceFiscalization()` and respond with HTTP 200 and a `FiscalizeResponse`
2. IF the invoice does not exist or belongs to a different company, THEN THE Invoice_Router SHALL respond with HTTP 404 and error code `NOT_FOUND`
3. IF the invoice already has a non-null `fiscalCode`, THEN THE Invoice_Router SHALL respond with HTTP 409 and error code `ALREADY_FISCALIZED`
4. IF fiscalization fails, THEN THE Invoice_Router SHALL respond with HTTP 422 and error code `FISCALIZATION_FAILED` with the ZIMRA error message
5. THE Invoice_Router SHALL NOT re-implement any fiscalization logic and SHALL delegate exclusively to `Fiscalization.processInvoiceFiscalization()`

---

### Requirement 5: Customer Management

**User Story:** As an external system using FiscalStack as its primary system, I want to create and manage customer records via API, so that I can reference customers when creating invoices.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/customers` request is received with a valid API key and a `name` field, THE Customer_Router SHALL create a customer via Storage and respond with HTTP 201 and the `CustomerResponse`
2. THE Customer_Router SHALL require the `name` field and SHALL reject requests missing it with HTTP 400 and error code `VALIDATION_ERROR`
3. WHEN a `GET /api/v1/customers` request is received, THE Customer_Router SHALL return all customers belonging to the authenticated company
4. WHEN a `GET /api/v1/customers/:id` request is received, THE Customer_Router SHALL return the customer if it belongs to the authenticated company
5. IF a requested customer does not exist or belongs to a different company, THEN THE Customer_Router SHALL respond with HTTP 404 and error code `NOT_FOUND`
6. WHEN a `PUT /api/v1/customers/:id` request is received for a customer belonging to the authenticated company, THE Customer_Router SHALL update the customer via Storage and respond with the updated `CustomerResponse`
7. THE Customer_Router SHALL always scope all operations to the authenticated company and SHALL NOT expose customers from other companies

---

### Requirement 6: Product Management

**User Story:** As an external system using FiscalStack as its primary system, I want to create and manage product records via API, so that I can reference products when creating invoices.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/products` request is received with a valid API key and required product fields, THE Product_Router SHALL create a product via Storage and respond with HTTP 201 and the product record
2. WHEN a `GET /api/v1/products` request is received, THE Product_Router SHALL return all products belonging to the authenticated company
3. WHEN a `PUT /api/v1/products/:id` request is received for a product belonging to the authenticated company, THE Product_Router SHALL update the product via Storage and respond with the updated product record
4. IF a requested product does not exist or belongs to a different company, THEN THE Product_Router SHALL respond with HTTP 404 and error code `NOT_FOUND`
5. THE Product_Router SHALL always scope all operations to the authenticated company and SHALL NOT expose products from other companies

---

### Requirement 7: Fiscal Device Status and Day Management

**User Story:** As an external system operator, I want to query fiscal device status and manage the fiscal day via API, so that I can ensure the device is ready before submitting invoices.

#### Acceptance Criteria

1. WHEN a `GET /api/v1/fiscal/status` request is received with a valid API key, THE Fiscal_Router SHALL return the current fiscal day status for the authenticated company via Storage
2. WHEN a `POST /api/v1/fiscal/open-day` request is received with a valid API key, THE Fiscal_Router SHALL open the fiscal day for the authenticated company via Storage and respond with HTTP 200
3. WHEN a `POST /api/v1/fiscal/close-day` request is received with a valid API key, THE Fiscal_Router SHALL close the fiscal day for the authenticated company via Storage and respond with HTTP 200
4. THE Fiscal_Router SHALL scope all fiscal day operations to the authenticated company

---

### Requirement 8: Sage Webhook Integration

**User Story:** As a Sage integration operator, I want inbound Sage webhooks to be received and processed by FiscalStack, so that Sage events are handled without disrupting the existing webhook implementation.

#### Acceptance Criteria

1. WHEN a `POST /api/v1/webhooks/sage` request is received, THE Webhook_Router SHALL delegate the request to the existing `sage-webhook.ts` router without modification
2. THE Webhook_Router SHALL NOT require an `X-API-Key` header for webhook endpoints
3. THE Webhook_Router SHALL rely on the existing HMAC-SHA256 signature verification implemented in `sage-webhook.ts`
4. IF the Sage webhook signature is invalid, THEN THE Webhook_Router SHALL respond with the error code returned by the existing `sage-webhook.ts` handler

---

### Requirement 9: Company Scope Isolation

**User Story:** As a FiscalStack platform operator, I want all API resources to be strictly scoped to the authenticated company, so that one company cannot access or modify another company's data.

#### Acceptance Criteria

1. THE API SHALL always derive `companyId` from the authenticated API key context and SHALL NOT accept `companyId` as a client-supplied parameter in any request body or query string
2. WHEN any resource (invoice, customer, product) is accessed by ID, THE API SHALL verify that the resource's `companyId` matches the authenticated company's ID before returning or modifying it
3. IF a resource exists but belongs to a different company, THEN THE API SHALL respond with HTTP 404 and error code `NOT_FOUND` rather than HTTP 403, to avoid leaking the existence of other companies' resources
4. THE API SHALL delegate all data access to Storage methods and SHALL NOT construct raw database queries that bypass company scoping

---

### Requirement 10: Request Validation

**User Story:** As an external system developer, I want clear validation errors when my requests are malformed, so that I can quickly identify and fix integration issues.

#### Acceptance Criteria

1. THE API SHALL validate all request bodies using a schema validation library (Zod) before passing them to route handlers
2. IF a request body fails schema validation, THEN THE API SHALL respond with HTTP 400, error code `VALIDATION_ERROR`, and a `details` array describing each validation failure
3. THE API SHALL validate that `items` arrays are non-empty for all invoice creation and pass-through fiscalization endpoints
4. THE API SHALL validate that numeric fields (`quantity`, `unitPrice`, `taxRate`) are non-negative numbers

---

### Requirement 11: Consistent Error Response Format

**User Story:** As an external system developer, I want all API errors to follow a consistent structure, so that I can handle errors programmatically without parsing free-form messages.

#### Acceptance Criteria

1. THE API SHALL return all error responses in the format `{ error: string, message: string, statusCode: number }`
2. THE API SHALL use machine-readable error codes (e.g., `INVALID_API_KEY`, `NOT_FOUND`, `VALIDATION_ERROR`, `FISCALIZATION_FAILED`, `ALREADY_FISCALIZED`) in the `error` field
3. THE API SHALL include a human-readable description in the `message` field of every error response
4. THE API SHALL use HTTP status codes consistently: 400 for validation errors, 401 for authentication failures, 404 for missing or inaccessible resources, 409 for conflict states, 422 for fiscalization failures

---

### Requirement 12: Module Structure and Routing

**User Story:** As a FiscalStack backend developer, I want the Integration API to live in a dedicated module mounted alongside the existing routes, so that the existing `routes.ts` monolith is not modified.

#### Acceptance Criteria

1. THE API SHALL be implemented in a dedicated `server/api/v1/` directory with separate files for middleware, each router, and the v1 index
2. THE API SHALL be mounted at `/api/v1` in the Express application without modifying the existing `routes.ts` file
3. THE API SHALL delegate all storage operations to the existing `Storage` interface and SHALL NOT re-implement any data access logic
4. THE API SHALL delegate all fiscalization to `Fiscalization.processInvoiceFiscalization()` and SHALL NOT re-implement any ZIMRA communication logic
