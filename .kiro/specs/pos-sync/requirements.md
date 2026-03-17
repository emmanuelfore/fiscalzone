# Requirements Document

## Introduction

The desktop POS is an Electron application that currently acts as a thin browser shell — it loads the web POS URL in a `BrowserWindow` and exposes only one native capability: receipt printing via IPC. The web POS, by contrast, is a fully-featured React application with offline support, shift management, hold/resume, barcode scanning, manager overrides, ZIMRA fiscalization, multi-currency, POS reports, and configurable settings.

The goal of this feature is to bring the desktop POS to full parity with the web POS by implementing the missing native-layer capabilities that the Electron shell must provide, and by ensuring the web POS features that depend on native APIs (printing, cash drawer, auto-update, kiosk mode) work correctly and reliably in the desktop context.

The web POS already handles all business logic (cart, checkout, offline queue, fiscalization, etc.) and runs inside the Electron `BrowserWindow`. The desktop parity work is therefore focused on the **Electron main process and preload bridge** — exposing the right native APIs so the web POS can use them, and adding desktop-only capabilities the web cannot provide.

## Glossary

- **Desktop_POS**: The Electron application (`desktop/`) that wraps the web POS in a native window.
- **Web_POS**: The React application (`client/src/pages/pos.tsx` and related files) that runs inside the Electron `BrowserWindow` and in the browser.
- **Preload_Bridge**: The Electron `preload.js` script that uses `contextBridge` to safely expose IPC APIs to the renderer (web POS).
- **IPC_Handler**: An `ipcMain.handle` registration in `desktop/main.js` that responds to renderer requests.
- **Print_Server**: The local HTTP middleware (`printer-client/`) used by the web POS for silent printing when running in a browser. Not needed in the desktop context.
- **Silent_Print**: Printing a receipt without showing the browser print dialog, using either the Electron native print API or the Print_Server middleware.
- **Cash_Drawer**: A physical cash drawer connected via a receipt printer's kick port, opened by sending an ESC/POS command.
- **Kiosk_Mode**: A locked-down window configuration that prevents users from navigating away from the POS application.
- **Auto_Updater**: A mechanism that checks for new application versions and installs them automatically or on user confirmation.
- **Offline_Credentials**: Hashed user credentials stored in IndexedDB by the web POS to allow login when the server is unreachable.
- **Shift**: A cashier work session with an opening balance, tracked sales, and a closing reconciliation.
- **Manager_Override**: A PIN-based authorization flow that allows a manager to approve restricted actions (discounts, voids, price changes, drawer open).
- **ZIMRA**: Zimbabwe Revenue Authority — the fiscal authority whose FDMS API the system integrates with for receipt fiscalization.
- **Receipt_48**: The 80mm thermal receipt format rendered by the web POS (`Receipt48` component).

---

## Requirements

### Requirement 1: Native Receipt Printing

**User Story:** As a cashier using the desktop POS, I want receipts to print directly to the thermal printer without a browser print dialog, so that checkout is fast and uninterrupted.

#### Acceptance Criteria

1. THE Desktop_POS SHALL expose a `printReceipt(html, printerName)` function on `window.electronAPI` via the Preload_Bridge.
2. WHEN `window.electronAPI.printReceipt` is called with receipt HTML and an optional printer name, THE IPC_Handler SHALL render the HTML in a hidden `BrowserWindow` and send it to the specified printer silently (no dialog).
3. IF no printer name is provided, THEN THE IPC_Handler SHALL use the system default printer.
4. WHEN printing completes successfully, THE IPC_Handler SHALL resolve the promise with `true`.
5. IF printing fails, THEN THE IPC_Handler SHALL reject the promise with a descriptive error message.
6. THE Desktop_POS SHALL expose a `getPrinters()` function on `window.electronAPI` that returns the list of available system printers.
7. WHEN `window.electronAPI` is defined, THE Web_POS SHALL use `window.electronAPI.printReceipt` for silent printing instead of the Print_Server HTTP endpoint.

---

### Requirement 2: Cash Drawer Control

**User Story:** As a cashier, I want the cash drawer to open automatically when a sale is completed, so that I can collect payment without manually triggering it.

#### Acceptance Criteria

1. THE Desktop_POS SHALL expose an `openCashDrawer(printerName)` function on `window.electronAPI` via the Preload_Bridge.
2. WHEN `window.electronAPI.openCashDrawer` is called, THE IPC_Handler SHALL send the ESC/POS cash drawer kick command (`ESC p 0 25 250`) to the specified printer.
3. IF no printer name is provided, THEN THE IPC_Handler SHALL send the command to the system default printer.
4. IF the printer is not found or the command fails, THEN THE IPC_Handler SHALL reject the promise with a descriptive error message.
5. WHEN `window.electronAPI` is defined and the POS settings have cash drawer enabled, THE Web_POS SHALL call `window.electronAPI.openCashDrawer` after a successful sale instead of showing a toast-only notification.

---

### Requirement 3: Kiosk Mode and Window Hardening

**User Story:** As a store manager, I want the desktop POS to run in a locked-down window so that cashiers cannot accidentally navigate away or close the application mid-transaction.

#### Acceptance Criteria

1. THE Desktop_POS SHALL launch the main window maximized and without a visible menu bar.
2. THE Desktop_POS SHALL prevent navigation to any URL that is not the configured POS application URL.
3. WHEN a user attempts to open a new window or tab from within the POS, THE Desktop_POS SHALL prevent the new window from opening.
4. THE Desktop_POS SHALL intercept the `will-navigate` event and cancel navigation to external URLs.
5. WHERE kiosk mode is enabled in the desktop configuration, THE Desktop_POS SHALL launch the window in full kiosk mode using Electron's `kiosk` window option.
6. THE Desktop_POS SHALL disable the default Electron application menu (`Menu.setApplicationMenu(null)`).

---

### Requirement 4: Auto-Updater

**User Story:** As a store owner, I want the desktop POS to update itself automatically when a new version is released, so that all terminals stay current without manual intervention.

#### Acceptance Criteria

1. THE Desktop_POS SHALL integrate `electron-updater` to check for updates on application startup.
2. WHEN a new update is available, THE Desktop_POS SHALL notify the renderer via IPC so the Web_POS can display an update banner to the user.
3. WHEN the user confirms the update, THE Desktop_POS SHALL download and install the update, then restart the application.
4. IF the update check fails due to a network error, THEN THE Desktop_POS SHALL log the error and continue normal operation without interrupting the POS session.
5. THE Desktop_POS SHALL expose an `onUpdateAvailable(callback)` and `installUpdate()` function on `window.electronAPI` so the Web_POS can trigger the update flow.
6. THE Desktop_POS build configuration SHALL include a `publish` target pointing to the update server so `electron-updater` can locate releases.

---

### Requirement 5: Offline-First Application Launch

**User Story:** As a cashier, I want to be able to log in and use the POS even when the internet is down, so that sales are never blocked by connectivity issues.

#### Acceptance Criteria

1. WHEN the Desktop_POS launches and the configured server URL is unreachable, THE Desktop_POS SHALL still load the application from the last cached state.
2. THE Web_POS already stores offline credentials in IndexedDB; WHEN a user logs in while offline, THE Web_POS SHALL authenticate against the locally cached credentials.
3. WHILE the application is offline, THE Web_POS SHALL queue all sales in the local IndexedDB pending sales store.
4. WHEN connectivity is restored, THE Web_POS SHALL automatically trigger the offline sync process to submit all pending sales to the server.
5. THE Desktop_POS SHALL expose an `isElectron` flag (`window.electronAPI.isElectron = true`) so the Web_POS can detect the desktop context and adjust behavior (e.g., skip Print_Server checks).

---

### Requirement 6: Printer Discovery and Configuration

**User Story:** As a store manager, I want to select and configure the receipt printer from within the POS settings, so that I don't need to use a separate print server middleware.

#### Acceptance Criteria

1. THE Desktop_POS SHALL expose a `getPrinters()` function on `window.electronAPI` that returns an array of available system printers with `name` and `isDefault` fields.
2. WHEN the POS settings page is open and `window.electronAPI` is defined, THE Web_POS SHALL call `window.electronAPI.getPrinters()` to populate the printer selection list instead of fetching from the Print_Server.
3. THE Web_POS SHALL persist the selected printer name in `localStorage` under the key `pos_printer_name`.
4. WHEN `window.electronAPI` is defined, THE Web_POS SHALL not display the "Print Server URL" configuration field, as it is not needed in the desktop context.
5. THE Desktop_POS SHALL expose a `testPrint(printerName)` function on `window.electronAPI` that sends a test page to the specified printer.

---

### Requirement 7: Application Configuration and Environment

**User Story:** As a system administrator, I want to configure the desktop POS target URL and environment without recompiling the application, so that I can point terminals at different environments (test vs. production).

#### Acceptance Criteria

1. THE Desktop_POS SHALL read the target application URL from an `ELECTRON_START_URL` environment variable if set.
2. IF `ELECTRON_START_URL` is not set, THEN THE Desktop_POS SHALL use the production URL for packaged builds and `http://localhost:5001/pos-login` for development builds.
3. THE Desktop_POS SHALL support a `config.json` file in the application's user data directory that can override the target URL and kiosk mode setting.
4. WHEN a `config.json` override is present, THE Desktop_POS SHALL use those values in preference to the compiled defaults.
5. THE Desktop_POS build configuration SHALL produce installers for both Windows (NSIS) and Linux (AppImage) targets.

---

### Requirement 8: Barcode Scanner Integration

**User Story:** As a cashier, I want to scan product barcodes using a USB barcode scanner to add items to the cart instantly, so that checkout is faster and more accurate.

#### Acceptance Criteria

1. THE Web_POS already handles keyboard-wedge barcode scanners (HID mode) via a keypress event listener; THE Desktop_POS SHALL not interfere with this behavior.
2. WHERE a serial/USB barcode scanner is connected and configured, THE Desktop_POS SHALL expose a `onBarcodeScan(callback)` function on `window.electronAPI` that fires when a barcode is scanned.
3. WHEN a barcode scan event is received via `window.electronAPI.onBarcodeScan`, THE Web_POS SHALL process it identically to a keyboard-wedge scan (look up product by barcode or SKU and add to cart).
4. THE Desktop_POS SHALL expose a `getSerialPorts()` function on `window.electronAPI` that returns available serial ports for scanner configuration.

---

### Requirement 9: Shift Management Parity

**User Story:** As a cashier, I want shift open/close to work identically on the desktop as on the web, including offline fallback, so that my work session is always tracked correctly.

#### Acceptance Criteria

1. THE Web_POS shift management (open shift, close shift, offline fallback via IndexedDB) SHALL function identically when running inside the Desktop_POS.
2. WHEN a shift is opened or closed while offline, THE Web_POS SHALL queue the action in the `pendingShifts` IndexedDB store and sync it when connectivity is restored.
3. THE Desktop_POS SHALL not block or interfere with the Web_POS's use of IndexedDB for shift caching.
4. WHEN the Desktop_POS launches, THE Web_POS SHALL automatically fetch the current shift status from the server if online, or load it from the IndexedDB cache if offline.

---

### Requirement 10: Manager Override Parity

**User Story:** As a store manager, I want PIN-based manager overrides (for discounts, voids, price changes, and drawer open) to work on the desktop POS, so that security controls are enforced consistently.

#### Acceptance Criteria

1. THE Web_POS manager override flow (PIN entry dialog, server-side PIN verification) SHALL function identically when running inside the Desktop_POS.
2. WHEN a manager override is required and the application is offline, THE Desktop_POS SHALL expose a `verifyManagerPin(pin, companyId)` function on `window.electronAPI` that verifies the PIN against locally cached manager credentials.
3. IF the server is reachable, THEN THE Web_POS SHALL verify the PIN via the `/api/companies/{companyId}/auth/verify-manager-pin` endpoint as it does today.
4. THE Desktop_POS SHALL cache manager PINs (hashed) in the Electron `safeStorage` encrypted store when a successful online verification occurs, so offline verification is possible.

---

### Requirement 11: POS Reports Parity

**User Story:** As a store manager, I want to access POS sales reports, shift reconciliation, and CSV exports from the desktop POS, so that I have full visibility into daily operations.

#### Acceptance Criteria

1. THE Web_POS POS reports page (`/reports/pos`) SHALL be accessible from within the Desktop_POS via the POS navigation menu.
2. THE Web_POS reports features (revenue trends, cashier performance, payment method breakdown, shift reconciliation, CSV export) SHALL function identically inside the Desktop_POS.
3. WHEN the Desktop_POS is offline, THE Web_POS reports page SHALL display data from the local IndexedDB cache where available, and show a clear "offline — data may be incomplete" notice for server-fetched data.

---

### Requirement 12: Receipt Format and ZIMRA Fiscalization Parity

**User Story:** As a cashier, I want receipts printed from the desktop POS to include the ZIMRA QR code and verification code, so that all printed receipts are fiscally compliant.

#### Acceptance Criteria

1. THE Web_POS `Receipt48` component (80mm thermal format with QR code, TIN, VAT number, verification code) SHALL render identically inside the Desktop_POS.
2. WHEN a fiscalized invoice is printed via `window.electronAPI.printReceipt`, THE receipt HTML SHALL include the ZIMRA QR code and verification code fields.
3. IF a sale is processed offline and has not yet been fiscalized, THEN THE receipt SHALL display a "PENDING FISCALIZATION" watermark in place of the QR code.
4. FOR ALL receipts printed via the Desktop_POS, THE printed output SHALL be equivalent to the receipt produced by the Web_POS browser print path (round-trip equivalence: same data in → same printed output).

---

### Requirement 13: Security and Data Isolation

**User Story:** As a store owner, I want the desktop POS to be secure so that cashiers cannot access sensitive data or system functions outside the POS application.

#### Acceptance Criteria

1. THE Desktop_POS SHALL set `nodeIntegration: false` and `contextIsolation: true` in all `BrowserWindow` `webPreferences`.
2. THE Preload_Bridge SHALL only expose the specific functions listed in Requirements 1–10 and SHALL NOT expose the full `ipcRenderer` or `require` to the renderer.
3. THE Desktop_POS SHALL not store API keys, database credentials, or session tokens in the Electron main process or in plain-text files.
4. WHEN the application window loses focus in kiosk mode, THE Desktop_POS SHALL not allow the window to be minimized or hidden.
5. THE Desktop_POS SHALL validate all data received from the renderer via IPC before passing it to native APIs (printer name, HTML content length limits).
