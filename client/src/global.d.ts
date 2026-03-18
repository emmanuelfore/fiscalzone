export {};

interface UpdateInfo {
  version: string;
  releaseNotes?: string;
}

interface ElectronAPI {
  isElectron: true;
  printReceipt: (html: string, printerName?: string) => Promise<boolean>;
  getPrinters: () => Promise<Array<{ name: string; isDefault: boolean }>>;
  testPrint: (printerName: string) => Promise<boolean>;
  openCashDrawer: (printerName?: string) => Promise<boolean>;
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;
  installUpdate: () => Promise<void>;
  onBarcodeScan: (callback: (barcode: string) => void) => void;
  offBarcodeScan: (callback: (barcode: string) => void) => void;
  getSerialPorts: () => Promise<Array<{ path: string; manufacturer?: string }>>;
  verifyManagerPin: (pin: string, companyId: number) => Promise<boolean>;
  cacheManagerPins: (companyId: number, hashes: Array<{ id: string; name: string; pinHash: string }>) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
