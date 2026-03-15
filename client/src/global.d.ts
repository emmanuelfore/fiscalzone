export {};

declare global {
  interface Window {
    electronAPI?: {
      printReceipt: (html: string, printerName?: string) => Promise<boolean>;
    };
  }
}
