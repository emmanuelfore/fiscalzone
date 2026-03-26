import * as Print from 'expo-print';

// Lazy-load native thermal printer to avoid crash on Expo Go / unsupported builds
let ThermalPrinterModule: any = null;
try {
  // Use a dynamic require within a try-catch for maximum safety
  const Printer = require('react-native-thermal-printer');
  ThermalPrinterModule = Printer.default || Printer;
} catch (e) {
  console.warn("[Printing] Thermal printer module not available:", e);
  // Not available in this build (e.g. Expo Go) — Bluetooth printing will be disabled
}

export interface TicketData {
  invoice: any;
  company: any;
  customer?: any;
  items?: any[];
  terminalId?: string;
  currencySymbol?: string;
  cashierName?: string;
  paidAmount?: number;
  paperWidth?: number;
  noteType?: "credit" | "debit";
  originalInvoiceNumber?: string;
}

/** True when the company is VAT-registered and can issue fiscal receipts */
const isFiscal = (company: any) => !!(company?.vatRegistered && company?.vatNumber);

/** Derive receipt title and fiscal footer marker based on note type */
function getNoteLabels(noteType: "credit" | "debit" | undefined, fiscal: boolean) {
  if (!noteType) {
    return {
      title: fiscal ? 'FISCAL TAX INVOICE' : 'TAX INVOICE',
      footerMarker: fiscal ? '*** FISCAL RECEIPT ***' : null,
    };
  }
  const isCredit = noteType === "credit";
  return {
    title: fiscal
      ? (isCredit ? 'FISCAL CREDIT NOTE' : 'FISCAL DEBIT NOTE')
      : (isCredit ? 'CREDIT NOTE' : 'DEBIT NOTE'),
    footerMarker: fiscal
      ? (isCredit ? '*** FISCAL CREDIT NOTE ***' : '*** FISCAL DEBIT NOTE ***')
      : null,
  };
}

export const generateReceiptHtml = (data: TicketData) => {
  const { invoice, company, items, customer, currencySymbol, cashierName, paidAmount, paperWidth, noteType, originalInvoiceNumber } = data;
  const symbol = currencySymbol || '$';
  const receiptItems = items || invoice.items || [];
  const width = paperWidth || 58;
  const isA4 = width >= 210;
  const receiptWidth = isA4 ? '210mm' : `${width}mm`;
  
  const fiscal = isFiscal(company);
  const { title, footerMarker } = getNoteLabels(noteType, fiscal);

  // Group taxes
  const taxGroups = receiptItems.reduce((acc: any, item: any) => {
    const taxRate = parseFloat(item.taxRate || 0);
    const price = parseFloat(item.price || 0);
    const qty = parseFloat(item.quantity || 0);
    const total = parseFloat(item.lineTotal || (price * qty));
    const rate = taxRate / 100;
    const taxAmount = (total * rate) / (1 + rate);
    const netAmount = total - taxAmount;
    const key = taxRate.toFixed(2);
    if (!acc[key]) {
      acc[key] = { rate: taxRate, net: 0, tax: 0, gross: 0, name: item.taxCode || (taxRate === 0 ? "Exempt" : `${taxRate}%`) };
    }
    acc[key].net += netAmount;
    acc[key].tax += taxAmount;
    acc[key].gross += total;
    return acc;
  }, {});

  const qrUrl = fiscal && invoice.qrCodeData
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoice.qrCodeData)}&size=100x100`
    : null;

  const total = Number(invoice.total || 0);
  const paid = Number(paidAmount || total);
  const change = Math.max(0, paid - total);

  // Format date identical to pos.tsx: dd/MM/yy HH:mm
  const dateObj = new Date(invoice.issueDate || invoice.createdAt);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedDate = `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear().toString().slice(-2)} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @media print {
            @page { size: ${isA4 ? 'A4' : `${receiptWidth} auto`}; margin: 0mm; }
            html, body { margin: 0 !important; padding: 0 !important; width: ${isA4 ? '210mm' : receiptWidth} !important; background: white; }
          }
          body { 
            font-family: 'Courier New', Courier, monospace; 
            color: black; 
            font-size: 10px; 
            line-height: 1.25; 
            width: ${receiptWidth}; 
            max-width: ${receiptWidth};
            margin: ${isA4 ? '0 auto' : '0'};
            padding: 2mm;
            box-sizing: border-box;
            background: white;
          }
          * { box-sizing: border-box; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
          .flex-col { flex-direction: column; }
          .text-right { text-align: right; }
          .text-xs { font-size: 12px; }
          .text-base { font-size: 16px; }
          .mb-1 { margin-bottom: 4px; }
          .mb-2 { margin-bottom: 8px; }
          .mt-1 { margin-top: 4px; }
          .pb-1 { padding-bottom: 4px; }
          .pb-2 { padding-bottom: 8px; }
          .pt-1 { padding-top: 4px; }
          .border-b-dashed { border-bottom: 1px dashed black; }
          .border-b-dotted { border-bottom: 1px dotted #888; }
          .w-45 { width: 45%; }
          .w-25 { width: 25%; }
          .w-10 { width: 10%; }
          .w-60 { width: 60%; }
          .w-30 { width: 30%; }
          .pl-2 { padding-left: 8px; }
          .text-9xs { font-size: 9px; }
          .whitespace-pre-wrap { white-space: pre-wrap; }
          .logo { max-height: 64px; object-fit: contain; }
        </style>
      </head>
      <body>
        ${company.logoUrl ? `<div class="flex justify-center mb-2 text-center"><img src="${company.logoUrl}" class="logo" /></div>` : ''}
        
        <h1 class="text-center font-bold uppercase text-xs mb-1">${company.name}</h1>
        
        <div class="text-center mb-1">
          <p>TIN: ${company.tin}</p>
          ${company.vatNumber ? `<p>VAT No: ${company.vatNumber}</p>` : ''}
        </div>
        
        <div class="text-center mb-1">
          <p>${company.tradingName || "Branch Name"}</p>
          <p class="whitespace-pre-wrap">${company.address || ""}</p>
          <p>${company.city || ""}</p>
        </div>
        
        <div class="text-center mb-2 pb-2 border-b-dashed">
          ${company.email ? `<p>${company.email}</p>` : ''}
          ${company.phone ? `<p>${company.phone}</p>` : ''}
        </div>

        <div class="text-center font-bold mb-2 pb-2 border-b-dashed">
          <p>${title}</p>
        </div>

        ${customer ? `
        <div class="mb-2 pb-2 border-b-dashed">
          <p class="font-bold">Buyer:</p>
          <p>${customer.name}</p>
          ${customer.tin ? `<p>TIN: ${customer.tin}</p>` : ''}
          ${customer.vatNumber ? `<p>VAT: ${customer.vatNumber}</p>` : ''}
          ${customer.address ? `<p>${customer.address}</p>` : ''}
          ${customer.email ? `<p>${customer.email}</p>` : ''}
          ${customer.phone ? `<p>${customer.phone}</p>` : ''}
        </div>
        ` : ''}

        <div class="mb-2 pb-2 border-b-dashed">
          <p>Invoice No: ${invoice.invoiceNumber || 'N/A'}</p>
          ${invoice.fiscalCode ? `
            <p>Receipt No: ${invoice.receiptCounter || 'N/A'} / ${invoice.receiptGlobalNo || 'N/A'}</p>
            <p>Fiscal Day No: ${invoice.fiscalDayNo || 'N/A'}</p>
            <p>Device Serial: ${company.fdmsDeviceSerialNo || company.deviceSerialNo || 'N/A'}</p>
            <p>Device ID: ${company.fdmsDeviceId || company.deviceId || 'N/A'}</p>
          ` : ''}
          ${invoice.customerReference ? `<p>Customer Ref: ${invoice.customerReference}</p>` : ''}
          <p>Date: ${formattedDate}</p>
          ${cashierName ? `<p>Cashier: ${cashierName}</p>` : ''}
          
          ${(noteType === 'credit' || noteType === 'debit') && originalInvoiceNumber ? `
            <div class="mt-1">
              <p class="font-bold">${noteType === 'credit' ? "Credited Invoice" : "Debited Invoice"}</p>
              <p>Invoice No: ${originalInvoiceNumber}</p>
            </div>
          ` : ''}
        </div>

        <div class="flex justify-between font-bold mb-1 border-b-dashed pb-1">
          <span class="w-45">Description</span>
          <span class="w-25 text-right">Amount</span>
          <span class="w-10 text-right">Tax</span>
        </div>

        <div class="mb-2 pb-2 border-b-dashed">
          ${receiptItems.map((item: any) => `
            <div class="mb-2">
              <div class="flex justify-between">
                <span class="w-60 font-bold">${item.description || item.name || ""}</span>
                <span class="w-30 text-right font-bold">${Number(item.lineTotal || (item.price * item.quantity)).toFixed(2)}</span>
                <span class="w-10 text-right">${item.taxCode || (item.taxRate > 0 ? "VT" : "ZE")}</span>
              </div>
              <div class="text-9xs pl-2">${Number(item.quantity)} x ${Number(item.unitPrice || item.price).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>

        <div class="mb-2 pb-2 border-b-dashed font-bold">
          <div class="flex justify-between text-base">
            <span>Total ${invoice.currency || "USD"}</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div class="mb-2 pb-2 border-b-dashed">
          <div class="flex justify-between">
            <span>${invoice.paymentMethod || "Cash"}</span>
            <span>${paid.toFixed(2)}</span>
          </div>
          ${change > 0 ? `<div class="flex justify-between"><span>Change</span><span>${change.toFixed(2)}</span></div>` : ''}
        </div>

        <div class="mb-2 pb-2 border-b-dashed text-center">
          <p>Number of Items: ${receiptItems.length}</p>
        </div>

        <div class="mb-2 pb-2 border-b-dashed">
          <p class="font-bold text-center mb-1">Tax Table</p>
          ${Object.values(taxGroups).map((group: any) => `
            <div class="mb-1">
              <div class="flex justify-between"><span>Net Amount</span><span>${group.net.toFixed(2)}</span></div>
              <div class="flex justify-between"><span>VAT (${group.name})</span><span>${group.tax.toFixed(2)}</span></div>
              <div class="flex justify-between font-bold border-b-dotted pb-1"><span>Gross Amount</span><span>${group.gross.toFixed(2)}</span></div>
            </div>
          `).join('')}
        </div>

        <div class="text-center mb-2">
          <p>${invoice.notes || "Invoice is issued after purchasing goods"}</p>
        </div>

        ${qrUrl ? `
          <div class="flex flex-col items-center mb-2 mt-1">
            <img src="${qrUrl}" width="100" height="100" />
            <p style="font-size: 7px; margin-top: 4px;">Scan to verify with ZIMRA</p>
            ${invoice.verificationCode ? `<div class="text-center mt-1"><p>Verification Code:</p><p class="font-bold">${invoice.verificationCode}</p></div>` : ''}
          </div>
        ` : ''}

        <div class="text-center text-9xs mt-1">
          <p>${company.posSettings?.receiptFooter || "Thank you for your business!"}</p>
          ${invoice._offline
            ? `<div style="border:1px solid black; padding:4px; font-weight:bold; margin-top:8px;"><p>*** PENDING SYNC ***</p><p style="font-weight:normal;">Will sync when online</p></div>`
            : footerMarker ? `<p>${footerMarker}</p>` : ''}
        </div>
      </body>
    </html>
  `;
};

export const printReceipt = async (data: TicketData, printerUrl?: string, silent?: boolean) => {
  try {
    const html = generateReceiptHtml(data);
    await Print.printAsync({ html, printerUrl: printerUrl || undefined });
  } catch (error) {
    console.error('[Printing] Standard print error:', error);
    throw error;
  }
};

export const printToBluetooth = async (data: TicketData, address?: string) => {
  if (!ThermalPrinterModule) {
    throw new Error("Bluetooth printing is not available in this build. Please use a custom dev client.");
  }

  const { invoice, company, items, customer, cashierName, paidAmount, paperWidth, noteType, originalInvoiceNumber } = data;
  const receiptItems = items || invoice.items || [];
  const width = paperWidth || 58;
  const fiscal = isFiscal(company);
  const { title, footerMarker } = getNoteLabels(noteType, fiscal);

  const getMaxChars = (w: number) => {
    if (w >= 80) return 48;
    if (w >= 58) return 32;
    if (w >= 50) return 26;
    if (w >= 40) return 20;
    return 15;
  };
  const maxChars = getMaxChars(width);
  const sep = "-".repeat(maxChars);

  const taxGroups = receiptItems.reduce((acc: any, item: any) => {
    const taxRate = parseFloat(item.taxRate || 0);
    const price = parseFloat(item.price || 0);
    const qty = parseFloat(item.quantity || 0);
    const total = parseFloat(item.lineTotal || (price * qty));
    const rate = taxRate / 100;
    const taxAmount = (total * rate) / (1 + rate);
    const netAmount = total - taxAmount;
    const key = taxRate.toFixed(2);
    if (!acc[key]) acc[key] = { rate: taxRate, net: 0, tax: 0, gross: 0, name: item.taxCode || (taxRate === 0 ? "Exempt" : `${taxRate}%`) };
    acc[key].net += netAmount;
    acc[key].tax += taxAmount;
    acc[key].gross += total;
    return acc;
  }, {});

  const totalVal = Number(invoice.total || 0);
  const paidVal = Number(paidAmount || totalVal);
  const changeVal = Math.max(0, paidVal - totalVal);
  const rate = (invoice.currency !== 'USD' ? Number(invoice.exchangeRate || 1) : 1);

  // Format date identical to pos.tsx: dd/MM/yy HH:mm
  const dateObj = new Date(invoice.issueDate || invoice.createdAt);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedDate = `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear().toString().slice(-2)} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

  let text = `[C]<b>${company.name}</b>\n`;
  text += `[C]TIN: ${company.tin}\n`;
  if (company.vatNumber) text += `[C]VAT No: ${company.vatNumber}\n`;
  text += `[C]${company.tradingName || "Branch Name"}\n`;
  text += `[C]${company.address || ''}\n`;
  text += `[C]${company.city || ''}\n`;
  text += `[C]${sep}\n`;
  if (company.email) text += `[C]${company.email}\n`;
  if (company.phone) text += `[C]${company.phone}\n`;
  text += `[C]${sep}\n`;
  text += `[C]<b>${title}</b>\n`;
  text += `[C]${sep}\n`;

  if (customer) {
    text += `[L]Buyer: ${customer.name}\n`;
    if (customer.tin) text += `[L]TIN: ${customer.tin}\n`;
    if (customer.vatNumber) text += `[L]VAT: ${customer.vatNumber}\n`;
    if (customer.address) text += `[L]${customer.address}\n`;
    if (customer.email) text += `[L]${customer.email}\n`;
    if (customer.phone) text += `[L]${customer.phone}\n`;
    text += `[C]${sep}\n`;
  }

  if (invoice.invoiceNumber) text += `[L]Invoice No: [R]${invoice.invoiceNumber}\n`;
  if (invoice.fiscalCode) {
    text += `[L]Receipt No: [R]${invoice.receiptCounter || 'N/A'} / ${invoice.receiptGlobalNo || 'N/A'}\n`;
    text += `[L]Fiscal Day No: [R]${invoice.fiscalDayNo || 'N/A'}\n`;
    text += `[L]Device Serial: [R]${company.fdmsDeviceSerialNo || company.deviceSerialNo || 'N/A'}\n`;
    text += `[L]Device ID: [R]${company.fdmsDeviceId || company.deviceId || 'N/A'}\n`;
  }
  if (invoice.customerReference) text += `[L]Customer Ref: [R]${invoice.customerReference}\n`;
  text += `[L]Date: [R]${formattedDate}\n`;
  if (cashierName) text += `[L]Cashier: [R]${cashierName}\n`;
  
  if ((noteType === 'credit' || noteType === 'debit') && originalInvoiceNumber) {
    text += `\n[L]<b>${noteType === 'credit' ? "Credited Invoice" : "Debited Invoice"}</b>\n`;
    text += `[L]Invoice No: [R]${originalInvoiceNumber}\n`;
  }
  text += `[C]${sep}\n`;

  text += `[L]<b>Description</b>[R]<b>Amount</b> Tax\n`;
  receiptItems.forEach((item: any) => {
    const nameLimit = Math.max(5, maxChars - 12);
    const name = (item.description || item.name || '').slice(0, nameLimit);
    const qty = Number(item.quantity).toFixed(0);
    const lineTotal = (Number(item.lineTotal || (Number(item.price) * Number(item.quantity))) * rate).toFixed(2);
    const taxCode = item.taxCode || (item.taxRate > 0 ? "VT" : "ZE");
    text += `[L]<b>${name}</b>[R]<b>${lineTotal}</b> ${taxCode}\n`;
    text += `[L]  ${qty} x ${Number(item.unitPrice || item.price).toFixed(2)}\n`;
  });
  text += `[C]${sep}\n`;

  text += `[L]<b>Total ${invoice.currency || "USD"}</b>[R]<b>${(totalVal * rate).toFixed(2)}</b>\n`;
  text += `[C]${sep}\n`;
  text += `[L]${invoice.paymentMethod || "Cash"}[R]${(paidVal * rate).toFixed(2)}\n`;
  if (changeVal > 0) text += `[L]Change[R]${(changeVal * rate).toFixed(2)}\n`;
  text += `[C]${sep}\n`;
  text += `[C]Number of Items: ${receiptItems.length}\n`;
  text += `[C]${sep}\n`;

  text += `[C]<b>Tax Table</b>\n`;
  Object.values(taxGroups).forEach((group: any) => {
    text += `[L]Net[R]${group.net.toFixed(2)}\n`;
    text += `[L]VAT (${group.name})[R]${group.tax.toFixed(2)}\n`;
    text += `[L]<b>Gross Amount</b>[R]<b>${group.gross.toFixed(2)}</b>\n`;
    text += `[C] ${".".repeat(Math.floor(maxChars / 2))} \n`;
  });
  text += `[C]${sep}\n`;

  text += `[C]${invoice.notes || "Invoice is issued after purchasing goods"}\n`;
  text += `[C]${sep}\n`;

  if (fiscal && invoice.qrCodeData) {
    text += `[C][QR]${invoice.qrCodeData}\n`;
    text += `[C]Scan to verify with ZIMRA\n`;
    if (invoice.verificationCode) {
      text += `[C]Verification Code:\n`;
      text += `[C]<b>${invoice.verificationCode}</b>\n`;
    }
  }

  text += `[C]${company.posSettings?.receiptFooter || "Thank you for your business!"}\n`;
  if (invoice._offline) text += `[C]*** PENDING SYNC ***\n[C]Will sync when online\n`;
  else if (footerMarker) text += `[C]${footerMarker}\n`;
  text += `\n\n\n`;

  await ThermalPrinterModule.printBluetooth({ payload: text, macAddress: address });
};

export const getBluetoothDevices = async (): Promise<{ deviceName: string; macAddress: string }[]> => {
  if (!ThermalPrinterModule) return [];
  try {
    const devices = await ThermalPrinterModule.getBluetoothDeviceList();
    return devices || [];
  } catch (error) {
    console.error("[Printing] Failed to scan bluetooth devices:", error);
    return [];
  }
};
