const { app, BrowserWindow, screen, ipcMain, Menu, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { SerialPort } = require('serialport');

const PROD_URL = 'https://fiscalzone.com/pos-login'; // TODO: Replace with actual deployed URL
const DEV_URL = 'http://localhost:5001/pos-login';

// Manager PIN cache helpers (Task 8.1)
const PIN_CACHE_KEY = 'manager-pin-cache';

function loadPinCache() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return {};
    const encPath = app.getPath('userData') + '/pin-cache.enc';
    if (!fs.existsSync(encPath)) return {};
    const buf = fs.readFileSync(encPath);
    const json = safeStorage.decryptString(buf);
    return JSON.parse(json);
  } catch { return {}; }
}

function savePinCache(cache) {
  try {
    if (!safeStorage.isEncryptionAvailable()) return;
    const encrypted = safeStorage.encryptString(JSON.stringify(cache));
    fs.writeFileSync(app.getPath('userData') + '/pin-cache.enc', encrypted);
  } catch (err) {
    log.error('[savePinCache] Failed:', err.message);
  }
}

function hashPin(pin, salt) {
  return crypto.createHash('sha256').update(pin + salt).digest('hex');
}

/**
 * Validates IPC input fields before passing to native APIs.
 * Each field is optional — only fields that are provided (not undefined) are validated.
 *
 * @param {object} opts
 * @param {string} [opts.html]        - Receipt HTML; must be a string ≤ 512 KB
 * @param {string} [opts.printerName] - Printer name; ≤ 256 chars, no path traversal
 * @param {string} [opts.pin]         - Manager PIN; must match /^\d{4,8}$/
 * @param {number} [opts.companyId]   - Company ID; must be a positive integer
 * @returns {{ error: string, code: 'VALIDATION_ERROR' } | null}
 */
function validateIpcInput({ html, printerName, pin, companyId } = {}) {
  if (html !== undefined) {
    if (typeof html !== 'string') {
      return { error: 'html must be a string', code: 'VALIDATION_ERROR' };
    }
    if (Buffer.byteLength(html, 'utf8') > 512 * 1024) {
      return { error: 'html exceeds maximum size of 512 KB', code: 'VALIDATION_ERROR' };
    }
  }

  if (printerName !== undefined) {
    if (typeof printerName !== 'string') {
      return { error: 'printerName must be a string', code: 'VALIDATION_ERROR' };
    }
    if (printerName.length > 256) {
      return { error: 'printerName exceeds maximum length of 256 characters', code: 'VALIDATION_ERROR' };
    }
    if (printerName.includes('..') || printerName.includes('/') || printerName.includes('\\')) {
      return { error: 'printerName contains invalid path traversal characters', code: 'VALIDATION_ERROR' };
    }
  }

  if (pin !== undefined) {
    if (!/^\d{4,8}$/.test(pin)) {
      return { error: 'pin must be a string of 4 to 8 digits', code: 'VALIDATION_ERROR' };
    }
  }

  if (companyId !== undefined) {
    if (!Number.isInteger(companyId) || companyId <= 0) {
      return { error: 'companyId must be a positive integer', code: 'VALIDATION_ERROR' };
    }
  }

  return null;
}

/**
 * Resolves the URL to load in the main window using the following priority:
 * 1. `startUrl` field in config.json from app.getPath('userData')
 * 2. ELECTRON_START_URL environment variable
 * 3. Production URL if app.isPackaged
 * 4. Dev default: http://localhost:5001/pos-login
 */
function resolveStartUrl() {
  // Priority 1: config.json in userData directory
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);
      if (config.startUrl) {
        return config.startUrl;
      }
    }
  } catch (err) {
    console.error('[resolveStartUrl] Failed to read config.json:', err.message);
  }

  // Priority 2: ELECTRON_START_URL environment variable
  if (process.env.ELECTRON_START_URL) {
    return process.env.ELECTRON_START_URL;
  }

  // Priority 3: packaged production URL
  if (app.isPackaged) {
    return PROD_URL;
  }

  // Priority 4: dev default
  return DEV_URL;
}

/**
 * Reads config.json from userData and returns the parsed object, or {} on error.
 */
function readConfig() {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[readConfig] Failed to read config.json:', err.message);
  }
  return {};
}

/**
 * Renders HTML in a hidden BrowserWindow and prints it silently to the named printer.
 * Shared by print-receipt and test-print handlers.
 *
 * @param {string} html - Full HTML string to print
 * @param {string|undefined} printerName - Target printer name, or undefined for system default
 * @returns {Promise<true>}
 */
function printHtmlToWindow(html, printerName) {
  return new Promise((resolve, reject) => {
    let printWindow = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false }
    });

    // 10-second load timeout
    const timeout = setTimeout(() => {
      if (printWindow && !printWindow.isDestroyed()) {
        printWindow.destroy();
        printWindow = null;
      }
      reject('Print timeout: page did not load within 10 seconds');
    }, 10000);

    printWindow.webContents.on('did-finish-load', () => {
      clearTimeout(timeout);
      printWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: printerName || undefined
      }, (success, errorType) => {
        if (!printWindow.isDestroyed()) {
          printWindow.destroy();
          printWindow = null;
        }
        if (success) {
          resolve(true);
        } else {
          reject(errorType);
        }
      });
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  });
}

/**
 * Registers all IPC handlers. Called once from createWindow().
 * @param {import('electron').BrowserWindow} mainWindow
 */
function registerIpcHandlers(mainWindow) {
  // Task 4.1: print-receipt — validate, render in hidden window, print silently
  ipcMain.handle('print-receipt', async (_event, html, printerName) => {
    const validationError = validateIpcInput({ html, printerName });
    if (validationError) {
      return Promise.reject(validationError.error);
    }
    return printHtmlToWindow(html, printerName);
  });

  // Task 4.2: get-printers — return system printer list mapped to { name, isDefault }
  ipcMain.handle('get-printers', async () => {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers.map(p => ({ name: p.name, isDefault: p.isDefault }));
  });

  // Task 4.3: test-print — send a minimal test page to the named printer
  ipcMain.handle('test-print', async (_event, printerName) => {
    const validationError = validateIpcInput({ printerName });
    if (validationError) {
      return Promise.reject(validationError.error);
    }
    const testHtml = '<html><body><h1>Test Print</h1><p>POS Terminal Test Page</p></body></html>';
    return printHtmlToWindow(testHtml, printerName);
  });

  // Task 7.2: install-update — quit and install the downloaded update
  ipcMain.handle('install-update', async () => {
    autoUpdater.quitAndInstall();
  });

  // Task 6.1: open-cash-drawer — send ESC/POS kick bytes [0x1B, 0x70, 0x00, 0x19, 0xFA] to the printer
  ipcMain.handle('open-cash-drawer', async (_event, printerName) => {
    if (printerName !== undefined) {
      const validationError = validateIpcInput({ printerName });
      if (validationError) {
        return Promise.reject(validationError.error);
      }
    }
    try {
      // Build HTML containing the raw ESC/POS cash drawer kick sequence as text content.
      // The bytes ESC p 0 25 250 (0x1B 0x70 0x00 0x19 0xFA) are embedded as actual characters.
      const kickBytes = String.fromCharCode(0x1B, 0x70, 0x00, 0x19, 0xFA);
      const drawerHtml = `<html><body><pre style="font-family:monospace">${kickBytes}</pre></body></html>`;
      return await printHtmlToWindow(drawerHtml, printerName);
    } catch (err) {
      return Promise.reject(typeof err === 'string' ? err : (err && err.message) ? err.message : 'Failed to open cash drawer');
    }
  });

  // Task 9.2: get-serial-ports — return available serial ports mapped to { path, manufacturer }
  ipcMain.handle('get-serial-ports', async () => {
    const ports = await SerialPort.list();
    return ports.map(p => ({ path: p.path, manufacturer: p.manufacturer }));
  });

  // cache-manager-pins — store scrypt hashes fetched from the server for offline verification
  ipcMain.handle('cache-manager-pins', async (_event, companyId, hashes) => {
    const pinError = validateIpcInput({ companyId });
    if (pinError) return Promise.reject(pinError.error);
    if (!Array.isArray(hashes)) return Promise.reject('hashes must be an array');

    const cache = loadPinCache();
    // Store raw scrypt hashes (format: "scryptHex.salt") keyed by companyId
    cache[companyId] = { scryptHashes: hashes, cachedAt: new Date().toISOString() };
    savePinCache(cache);
    log.info(`[cache-manager-pins] Cached ${hashes.length} PIN hash(es) for company ${companyId}`);
  });

  // Task 8.1: verify-manager-pin — validate PIN and companyId; try online, fall back to cached scrypt hashes
  ipcMain.handle('verify-manager-pin', async (_event, pin, companyId) => {
    // Validate PIN format; companyId is optional — we'll handle 0/missing gracefully
    const pinError = validateIpcInput({ pin });
    if (pinError) return Promise.reject(pinError.error);

    const cache = loadPinCache();

    // Resolve effective companyId
    let effectiveCompanyId = (Number.isInteger(companyId) && companyId > 0) ? companyId : null;
    if (!effectiveCompanyId) {
      const keys = Object.keys(cache);
      if (keys.length === 1) {
        effectiveCompanyId = parseInt(keys[0]);
        log.warn(`[verify-manager-pin] companyId missing/invalid (${companyId}), falling back to cached companyId: ${effectiveCompanyId}`);
      }
    }

    // Try online verification first (if we have a valid companyId)
    if (effectiveCompanyId) {
      try {
        const startUrl = resolveStartUrl();
        const baseUrl = new URL(startUrl);
        const apiUrl = `${baseUrl.protocol}//${baseUrl.host}/api/companies/${effectiveCompanyId}/auth/verify-manager-pin`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          log.info(`[verify-manager-pin] Online verification succeeded for company ${effectiveCompanyId}`);
          return true;
        }
        if (response.status === 401) {
          log.warn(`[verify-manager-pin] Online verification denied for company ${effectiveCompanyId}`);
          return false;
        }
        // Non-401 error (5xx etc.) — fall through to offline cache
        log.warn(`[verify-manager-pin] Online returned ${response.status}, falling back to cache`);
      } catch (err) {
        log.warn('[verify-manager-pin] Online check failed, trying cache:', err.message);
      }

      // Offline: verify against scrypt hashes cached from the server
      const entry = cache[effectiveCompanyId];
      if (entry && Array.isArray(entry.scryptHashes) && entry.scryptHashes.length > 0) {
        for (const { pinHash } of entry.scryptHashes) {
          if (!pinHash || !pinHash.includes('.')) continue;
          const [storedHex, salt] = pinHash.split('.');
          try {
            const derived = await new Promise((resolve, reject) => {
              crypto.scrypt(pin, salt, 64, (err, buf) => err ? reject(err) : resolve(buf.toString('hex')));
            });
            if (derived === storedHex) {
              log.info(`[verify-manager-pin] Offline scrypt verification succeeded for company ${effectiveCompanyId}`);
              return true;
            }
          } catch (scryptErr) {
            log.error('[verify-manager-pin] scrypt error:', scryptErr.message);
          }
        }
        log.warn(`[verify-manager-pin] Offline scrypt verification failed for company ${effectiveCompanyId}`);
        return false;
      }

      log.warn(`[verify-manager-pin] No cached PIN hashes for company ${effectiveCompanyId}`);
      return false;
    }

    // No valid companyId — try all cached entries
    log.warn('[verify-manager-pin] No valid companyId — trying PIN against all cached entries');
    for (const entry of Object.values(cache)) {
      if (!entry.scryptHashes) continue;
      for (const { pinHash } of entry.scryptHashes) {
        if (!pinHash || !pinHash.includes('.')) continue;
        const [storedHex, salt] = pinHash.split('.');
        try {
          const derived = await new Promise((resolve, reject) => {
            crypto.scrypt(pin, salt, 64, (err, buf) => err ? reject(err) : resolve(buf.toString('hex')));
          });
          if (derived === storedHex) return true;
        } catch { /* skip */ }
      }
    }
    return false;
  });
}

/**
 * Initialises electron-updater. Checks for updates on startup, forwards
 * `update-available` to the renderer, and logs all errors without interrupting
 * the POS session.
 *
 * @param {import('electron').BrowserWindow} mainWindow
 */
function initAutoUpdater(mainWindow) {
  autoUpdater.logger = log;
  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('update-available', info);
  });
  autoUpdater.on('error', (err) => {
    log.error('[autoUpdater] Error:', err.message);
  });
  // Only check for updates when a publish config is present (packaged builds)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      log.error('[autoUpdater] checkForUpdatesAndNotify failed:', err.message);
    });
  }
}

/**
 * Opens the configured serial port and forwards trimmed barcode strings to the renderer.
 * Logs and skips silently if the port is unavailable or not configured.
 *
 * @param {import('electron').BrowserWindow} mainWindow
 * @param {string|undefined} portPath - Serial port path from config.json.scannerPort
 */
function initBarcodeScanner(mainWindow, portPath) {
  if (!portPath) return;
  try {
    const port = new SerialPort({ path: portPath, baudRate: 9600 });
    let buffer = '';
    port.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop(); // keep incomplete line
      for (const line of lines) {
        const barcode = line.trim();
        if (barcode) {
          mainWindow.webContents.send('barcode-scan', barcode);
        }
      }
    });
    port.on('error', (err) => {
      log.error('[initBarcodeScanner] Serial port error:', err.message);
    });
  } catch (err) {
    log.error('[initBarcodeScanner] Failed to open port:', err.message);
  }
}

function createWindow() {
  // Requirement 3.6: disable the default application menu
  Menu.setApplicationMenu(null);

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const config = readConfig();

  // IndexedDB: no CSP or session partition overrides are set here, so the renderer
  // has full access to IndexedDB for offline credential caching, pending sales, and shift data.
  const mainWindow = new BrowserWindow({
    width: width,
    height: height,
    // Requirement 3.5: apply kiosk mode when enabled in config
    kiosk: config.kioskMode === true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: "POS Desktop Terminal",
    icon: path.join(__dirname, 'icon.png'), // Placeholder if icon exists
    show: false // We will show it and maximize it to prevent flickering
  });

  mainWindow.maximize();
  mainWindow.show();

  // Open DevTools with Ctrl+Shift+I (toggle)
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });

  initAutoUpdater(mainWindow);

  registerIpcHandlers(mainWindow);

  initBarcodeScanner(mainWindow, config.scannerPort);

  const posUrl = resolveStartUrl();
  mainWindow.loadURL(posUrl);

  // Requirement 3.4: intercept will-navigate and block external URLs (same-origin check).
  // Same-origin navigation (e.g., /pos → /reports/pos) is allowed; only cross-origin is blocked.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const target = new URL(url);
      const origin = new URL(posUrl);
      if (target.origin !== origin.origin) {
        event.preventDefault();
      }
    } catch (_err) {
      // Malformed URL — block it
      event.preventDefault();
    }
  });

  // Requirement 3.3: block all new window creation
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  mainWindow.on('closed', function () {
    app.quit();
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
