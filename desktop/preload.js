const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printReceipt: (html, printerName) => ipcRenderer.invoke('print-receipt', html, printerName)
});
