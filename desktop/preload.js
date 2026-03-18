const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Identity
  isElectron: true,

  // Printing
  printReceipt: (html, printerName) => ipcRenderer.invoke('print-receipt', html, printerName),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  testPrint: (printerName) => ipcRenderer.invoke('test-print', printerName),

  // Cash Drawer
  openCashDrawer: (printerName) => ipcRenderer.invoke('open-cash-drawer', printerName),

  // Auto-Updater
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_, info) => callback(info)),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Barcode Scanner
  onBarcodeScan: (callback) => {
    const wrapper = (_, barcode) => callback(barcode);
    callback._ipcWrapper = wrapper;
    ipcRenderer.on('barcode-scan', wrapper);
  },
  offBarcodeScan: (callback) => {
    if (callback._ipcWrapper) {
      ipcRenderer.removeListener('barcode-scan', callback._ipcWrapper);
      delete callback._ipcWrapper;
    }
  },
  getSerialPorts: () => ipcRenderer.invoke('get-serial-ports'),

  // Manager PIN (offline verification)
  verifyManagerPin: (pin, companyId) => ipcRenderer.invoke('verify-manager-pin', pin, companyId),
  cacheManagerPins: (companyId, hashes) => ipcRenderer.invoke('cache-manager-pins', companyId, hashes),
});
