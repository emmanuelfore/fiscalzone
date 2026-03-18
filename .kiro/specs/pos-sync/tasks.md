# Implementation Plan: Desktop POS Parity (pos-sync)

## Overview

Incrementally build out the Electron main process and preload bridge so the desktop POS reaches full feature parity with the web POS. Each task wires one capability end-to-end before moving to the next.

## Tasks

- [x] 1. Harden `desktop/main.js` — window config, navigation guards, and config loading
  - [x] 1.1 Implement `resolveStartUrl()` — read `config.json` from `app.getPath('userData')`, fall back to `ELECTRON_START_URL` env var, then packaged/dev defaults
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 1.2 Write unit tests for `resolveStartUrl()` covering all four priority levels
    - Test config.json > ELECTRON_START_URL > packaged default > dev default
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [ ]* 1.3 Write property test for `resolveStartUrl()` — Property 18 & 19
    - **Property 18: URL loaded from ELECTRON_START_URL when set**
    - **Property 19: config.json overrides compiled defaults**
    - **Validates: Requirements 7.1, 7.3, 7.4**
  - [x] 1.4 Add navigation guards: intercept `will-navigate` to block external URLs; use `setWindowOpenHandler` to block new windows
    - Call `Menu.setApplicationMenu(null)`
    - Apply `kiosk` option from config when `kioskMode: true`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 1.5 Write unit tests for navigation guard with specific URL examples (same-origin allowed, external blocked)
    - _Requirements: 3.2, 3.4_
  - [ ]* 1.6 Write property test for navigation guard — Property 8 & 9
    - **Property 8: Navigation to external URLs is blocked**
    - **Property 9: New window creation is blocked**
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 2. Rewrite `desktop/preload.js` — full `window.electronAPI` bridge
  - [x] 2.1 Expose the complete `ElectronAPI` surface via `contextBridge.exposeInMainWorld`: `isElectron`, `printReceipt`, `getPrinters`, `testPrint`, `openCashDrawer`, `onUpdateAvailable`, `installUpdate`, `onBarcodeScan`, `getSerialPorts`, `verifyManagerPin`
    - Do NOT expose `ipcRenderer` or `require` directly
    - _Requirements: 1.1, 2.1, 4.5, 5.5, 6.1, 6.5, 8.2, 8.4, 10.2, 13.1, 13.2_
  - [x] 2.2 Update `client/src/global.d.ts` (or equivalent type declaration file) to reflect the full `ElectronAPI` interface
    - _Requirements: 1.1, 2.1, 4.5, 5.5, 6.1, 8.2, 10.2_

- [x] 3. Implement IPC input validation helper in `desktop/main.js`
  - [x] 3.1 Write a `validateIpcInput({ html, printerName, pin, companyId })` function that enforces: `html` ≤ 512 KB string, `printerName` ≤ 256 chars with no path traversal, `pin` is 4–8 digits, `companyId` is a positive integer
    - Return `{ error, code: 'VALIDATION_ERROR' }` on failure
    - _Requirements: 13.5_
  - [ ]* 3.2 Write property test for IPC input validation — Property 26
    - **Property 26: IPC input validation rejects oversized or malformed data**
    - **Validates: Requirements 13.5**

- [x] 4. Implement receipt printing IPC handlers
  - [x] 4.1 Implement `print-receipt` handler: validate inputs, render HTML in hidden `BrowserWindow`, call `webContents.print({ silent: true, deviceName })`, resolve `true` on success, reject with error string on failure; add 10-second load timeout
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  - [x] 4.2 Implement `get-printers` handler: return `webContents.getPrintersAsync()` mapped to `{ name, isDefault }`
    - _Requirements: 1.6, 6.1_
  - [x] 4.3 Implement `test-print` handler: send a minimal test page HTML to the named printer via the same hidden-window path
    - _Requirements: 6.5_
  - [ ]* 4.4 Write unit tests for `print-receipt` handler covering success, failure, and timeout paths
    - _Requirements: 1.2, 1.4, 1.5_
  - [ ]* 4.5 Write property tests for printing — Property 1, 2, 3
    - **Property 1: Silent print uses correct printer**
    - **Property 2: Print failure rejects with message**
    - **Property 3: getPrinters returns valid shape**
    - **Validates: Requirements 1.2, 1.3, 1.5, 1.6, 6.1**

- [x] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement cash drawer IPC handler
  - [x] 6.1 Implement `open-cash-drawer` handler: validate printer name, send ESC/POS kick bytes `[0x1B, 0x70, 0x00, 0x19, 0xFA]` to the named (or default) printer via a raw print job, reject with error string on failure
    - _Requirements: 2.2, 2.3, 2.4_
  - [ ]* 6.2 Write property tests for cash drawer — Property 5 & 6
    - **Property 5: Cash drawer sends correct ESC/POS byte sequence**
    - **Property 6: Cash drawer failure rejects with message**
    - **Validates: Requirements 2.2, 2.3, 2.4**

- [x] 7. Implement auto-updater integration
  - [x] 7.1 Add `electron-updater` dependency; implement `initAutoUpdater(mainWindow)` in `desktop/main.js`: call `autoUpdater.checkForUpdatesAndNotify()` on app ready, forward `update-available` event to renderer via `mainWindow.webContents.send`, catch all errors with `electron-log` and continue
    - _Requirements: 4.1, 4.2, 4.4_
  - [x] 7.2 Implement `install-update` IPC handler: call `autoUpdater.quitAndInstall()`
    - _Requirements: 4.3_
  - [x] 7.3 Add `publish` config to `package.json` `build` section pointing to the update server
    - _Requirements: 4.6_
  - [ ]* 7.4 Write property tests for auto-updater — Property 10 & 11
    - **Property 10: Update available notification reaches renderer**
    - **Property 11: Update check failure does not interrupt POS session**
    - **Validates: Requirements 4.2, 4.4**

- [x] 8. Implement manager PIN cache (safeStorage) and IPC handler
  - [x] 8.1 Implement `verify-manager-pin` handler: validate `pin` and `companyId`; if online, proxy to `/api/companies/{companyId}/auth/verify-manager-pin` and on success cache the hashed PIN in `safeStorage` (SHA-256 with random salt); if offline, compare against cached hash
    - _Requirements: 10.2, 10.3, 10.4_
  - [ ]* 8.2 Write property test for manager PIN — Property 22
    - **Property 22: Manager PIN verification round-trip**
    - **Validates: Requirements 10.2, 10.3, 10.4**

- [x] 9. Implement barcode scanner (serial port) integration
  - [x] 9.1 Add `serialport` dependency; implement `initBarcodeScanner(mainWindow, portPath)` in `desktop/main.js`: open the configured serial port from `config.json.scannerPort`, emit trimmed barcode strings to renderer via `mainWindow.webContents.send('barcode-scan', barcode)`, log and skip if port unavailable
    - _Requirements: 8.2, 8.4_
  - [x] 9.2 Implement `get-serial-ports` handler: return `SerialPort.list()` mapped to `{ path, manufacturer }`
    - _Requirements: 8.4_
  - [ ]* 9.3 Write property test for barcode scanner — Property 20
    - **Property 20: Barcode scan callback fires with correct value**
    - **Validates: Requirements 8.2, 8.3**

- [x] 10. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update web POS — printing and cash drawer integration
  - [x] 11.1 In `client/src/pages/pos.tsx` (or the print utility it calls), add a branch: if `window.electronAPI` is defined, call `window.electronAPI.printReceipt(html, printerName)` instead of POSTing to the Print Server HTTP endpoint
    - _Requirements: 1.7_
  - [x] 11.2 In `client/src/pages/pos.tsx`, after a successful sale, add a branch: if `window.electronAPI` is defined and cash drawer is enabled in POS settings, call `window.electronAPI.openCashDrawer(printerName)`
    - _Requirements: 2.5_
  - [ ]* 11.3 Write property tests for web POS print/drawer routing — Property 4 & 7
    - **Property 4: Web POS routes print through electronAPI when available**
    - **Property 7: Web POS calls openCashDrawer after sale when enabled**
    - **Validates: Requirements 1.7, 2.5**

- [x] 12. Update web POS — settings page (printer discovery, UI)
  - [x] 12.1 In `client/src/pages/pos-settings.tsx`, add a branch: if `window.electronAPI` is defined, call `window.electronAPI.getPrinters()` to populate the printer list instead of fetching from the Print Server URL
    - Persist selected printer to `localStorage` under key `pos_printer_name`
    - _Requirements: 6.2, 6.3_
  - [x] 12.2 In `client/src/pages/pos-settings.tsx`, conditionally hide the "Print Server URL" input field when `window.electronAPI` is defined
    - _Requirements: 6.4_
  - [ ]* 12.3 Write property tests for settings page — Property 15, 16, 17
    - **Property 15: Settings uses getPrinters when electronAPI present**
    - **Property 16: Printer name persisted in localStorage**
    - **Property 17: Print Server URL field hidden when electronAPI present**
    - **Validates: Requirements 6.2, 6.3, 6.4**

- [x] 13. Update web POS — update banner and barcode scanner listener
  - [x] 13.1 In `client/src/pages/pos-login.tsx` (or a persistent layout component), register `window.electronAPI.onUpdateAvailable` and display an update banner; wire the confirm action to `window.electronAPI.installUpdate()`
    - _Requirements: 4.2, 4.3, 4.5_
  - [x] 13.2 In `client/src/pages/pos.tsx`, register `window.electronAPI.onBarcodeScan` when `window.electronAPI` is defined and process the barcode identically to a keyboard-wedge scan (same product lookup path)
    - _Requirements: 8.2, 8.3_

- [x] 14. Update web POS — offline manager PIN fallback
  - [x] 14.1 In the manager override PIN verification flow, add a branch: if `window.electronAPI` is defined and the server is unreachable, call `window.electronAPI.verifyManagerPin(pin, companyId)` instead of the online API
    - _Requirements: 10.2, 10.3_

- [x] 15. Verify offline-first and shift/reports parity (no-op or minor fixes)
  - [x] 15.1 Confirm `window.electronAPI.isElectron` is set to `true` in preload (already covered in task 2.1); verify the web POS uses it to skip Print Server checks
    - _Requirements: 5.5_
  - [x] 15.2 Confirm `desktop/main.js` does not interfere with IndexedDB access (no CSP or partition overrides that would block it); add a comment in `createWindow()` documenting this
    - _Requirements: 5.1, 9.3_
  - [x] 15.3 Confirm the POS reports route (`/reports/pos`) is reachable from within the desktop window (not blocked by navigation guards — same-origin)
    - _Requirements: 11.1, 11.2_

- [x] 16. Update `electron-builder` config for Windows (NSIS) and Linux (AppImage) targets
  - [x] 16.1 Add or update the `build` section in `package.json` with `win` (NSIS) and `linux` (AppImage) targets alongside the `publish` config from task 7.3
    - _Requirements: 7.5_

- [x] 17. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use **fast-check** with a minimum of 100 iterations each; each test file must include a comment `// Feature: pos-sync, Property N: <property text>`
- The web POS business logic (cart, checkout, fiscalization, offline queue, shift management) is unchanged — all branching is additive (`if window.electronAPI`)
- `desktop/preload.js` must never expose `ipcRenderer` or Node.js APIs directly (Requirement 13.2)
