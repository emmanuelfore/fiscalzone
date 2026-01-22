 📋 Implementation Plan: ZIMRA Invoice Pro

This plan outlines the roadmap to implement the detailed requirements for FDMS integration, extended management features, and professional reporting.

## Phase 1: Foundation & Schema Expansion 🏗️
**Goal**: Update the database to support all new data fields and preparing for FDMS.

- [ ] **Schema Updates**
    - [ ] **Customers**: Add `phone`, `mobile`, `billingAddress`, `vatNumber`, `bpNumber`, `notes`, `type` (Individual/Business).
    - [ ] **Products**: Add `sku`, `barcode`, `costPrice`, `category`, `isTracked`, `stockLevel`, `lowStockThreshold`.
    - [ ] **ServicesTable** (New): Create schema for service-based items (hourly/daily rates).
    - [ ] **Invoices**: Add columns for `fiscalCode`, `qrCodeData`, `fdmsStatus`, `submissionId`, `currency`.
    - [ ] **Company**: Add `logoUrl`, `vatEnabled`, `defaultPaymentTerms`, `bankDetails`, `fdmsDeviceId`, `fdmsKey`.

## Phase 2: FDMS Integration & QR Codes ⚡
**Goal**: Core ZIMRA compliance features.

- [ ] **FDMS Service**
    - [ ] Create `server/services/fdms.ts`.
    - [ ] Implement `submitInvoice`, `getDayStatus`, `openDay`, `closeDay`.
    - [ ] Create **Retry Queue**: System to store failed submissions and retry when online.
- [ ] **QR Code Generation**
    - [ ] Implement utility to generate ZIMRA-standard JSON payload.
    - [ ] Generate QR Image for UI and PDF.
- [ ] **Fiscalization Flow**
    - [ ] Update `createInvoice` to trigger fiscalization.
    - [ ] Block modification of fiscalized invoices.

## Phase 3: Enhanced Management Modules 👥
**Goal**: Rich CRUD interfaces for business data.

- [ ] **Customer Management**
    - [ ] Update `CustomersPage` with new fields.
    - [ ] Add `CustomerDetails` page with history and statements.
    - [ ] Implement CSV Import/Export.
- [ ] **Product & Service Management**
    - [ ] Update `ProductsPage` with new fields.
    - [ ] Add Inventory Tracking logic (deduct stock on invoice issue).
    - [ ] Add CSV Import.

## Phase 4: Professional PDF Invoicing 📄
**Goal**: Beautiful, compliant documents.

- [ ] **PDF Generator**
    - [ ] Integrate `@react-pdf/renderer` or similar.
    - [ ] Design template with Logo, Company Details, Customer Details, Line Items, Tax Table, **QR Code**, Footer.
    - [ ] Add "Draft" watermark logic.

## Phase 5: Reporting & Analytics 📊
**Goal**: Business intelligence.

- [ ] **Reports Engine**
    - [ ] Build backend queries for: Sales over time, Tax summary, Top products.
- [ ] **Dashboard Widgets**
    - [ ] Visual charts (Recharts) for revenue and tax.
- [ ] **Exports**
    - [ ] Tax Return CSV/PDF export.

## Phase 6: Settings & Email ⚙️
**Goal**: Configuration and communication.

- [ ] **Settings API**
    - [ ] Endpoints to update Company branding, Tax rates, FDMS keys.
- [ ] **Email Service**
    - [ ] Setup `nodemailer` or SendGrid/Postmark integration.
    - [ ] Create templates for "Invoice Sent", "Welcome", "Overdue".

## Phase 7: Offline Mode & Retry Queue 🔄 (ZIMRA Mandatory)
**Goal**: Support business continuity when ZIMRA servers are down.

- [ ] **Offline Detection**
    - [ ] Implement timeout and error handling in `ZimraDevice` to detect server issues.
- [ ] **Local Chaining**
    - [ ] When offline, generate local receipt signatures to maintain the hash chain on the device side.
- [ ] **Sync Queue**
    - [ ] Mark invoices as `sync_pending` in the database.
    - [ ] Implement a backend worker that checks for connectivity and auto-submits pending receipts.
- [ ] **UI Status**
    - [ ] Add "Pending Sync" status badge to invoices.

## Phase 8: Tax Configuration Sync 🧬
**Goal**: Keep local tax rates perfectly aligned with ZIMRA IDs.

- [ ] **Sync Algorithm**
    - [ ] Implementation of `getConfig` call in `server/zimra.ts`.
    - [ ] Route to trigger sync and update `tax_categories` table.
- [ ] **Validation Layer**
    - [ ] Pre-check invoice taxes against ZIMRA active taxes before submission.

---

## 🚀 Recommended Next Step
**Phase 1: Schema Updates**. We cannot build the features without the database columns.
Shall we start by defining the new `schema.ts`?
