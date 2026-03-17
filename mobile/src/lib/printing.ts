import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
// Note: react-native-thermal-printer might need a dev client. 
// We'll wrap it in a try-catch for safety if it's not available in certain environments.
import ThermalPrinterModule from 'react-native-thermal-printer';

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
}


export const generateReceiptHtml = (data: TicketData) => {
  const { invoice, company, customer, items, currencySymbol, cashierName, paidAmount, paperWidth } = data;
  const symbol = currencySymbol || '$';
  const receiptItems = items || invoice.items || [];
  const width = paperWidth || 58;
  const isWide = width >= 80;
  
  // Group taxes identical to web POS
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
      acc[key] = {
        rate: taxRate,
        net: 0,
        tax: 0,
        gross: 0,
        name: item.taxCode || (taxRate === 0 ? "Exempt" : `${taxRate}%`)
      };
    }
    acc[key].net += netAmount;
    acc[key].tax += taxAmount;
    acc[key].gross += total;
    return acc;
  }, {});

  const qrUrl = invoice.qrCodeData 
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoice.qrCodeData)}&size=100x100`
    : null;

  const total = Number(invoice.total || 0);
  const paid = Number(paidAmount || total);
  const change = Math.max(0, paid - total);

  const displayField = (label: string, value: any) => {
    if (!value || value === "N/A" || value === "null / null") return "";
    return `<p>${label}: ${value}</p>`;
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 4px;
            color: black;
            font-size: ${isWide ? '11px' : '9px'};
            line-height: 1.1;
            width: ${width}mm;
            margin: 0;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .uppercase { text-transform: uppercase; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .justify-center { justify-content: center; }
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
          .border-b { border-bottom: 1px dashed black; }
          .border-dotted { border-bottom: 1px dotted #888; }
          .w-45 { width: 45%; }
          .w-25 { width: 25%; }
          .w-10 { width: 10%; }
          .w-60 { width: 60%; }
          .w-30 { width: 30%; }
          .pl-2 { padding-left: 8px; }
          .text-9xs { font-size: 9px; }
          .whitespace-pre-wrap { white-space: pre-wrap; }
          .offline-badge { border: 1px solid black; padding: 4px; font-weight: bold; margin-top: 8px; }
        </style>
      </head>
      <body>
        <h1 class="text-center font-bold uppercase text-xs mb-1">${company.name}</h1>
        <div class="text-center mb-1">
          <p>TIN: ${company.tin}</p>
          ${company.vatNumber ? `<p>VAT No: ${company.vatNumber}</p>` : ''}
        </div>
        <div class="text-center mb-1">
          <p>${company.tradingName || "Branch Name"}</p>
          <p class="whitespace-pre-wrap">${company.address}</p>
          <p>${company.city}</p>
        </div>
        <div class="text-center mb-2 pb-2 border-b">
          ${company.email ? `<p>${company.email}</p>` : ''}
          ${company.phone ? `<p>${company.phone}</p>` : ''}
        </div>

        <div class="text-center font-bold mb-2 pb-2 border-b">
          <p>FISCAL TAX INVOICE</p>
        </div>

        <div class="mb-2 pb-2 border-b">
          ${cashierName ? `<p>Cashier: ${cashierName}</p>` : ''}
          ${displayField("Invoice No", invoice.invoiceNumber || (invoice.id ? `#${invoice.id}` : null))}
          ${(invoice.receiptCounter && invoice.receiptCounter !== "N/A") ? `<p>Receipt No: ${invoice.receiptCounter} / ${invoice.receiptGlobalNo || ""}</p>` : ''}
          ${(invoice.fiscalDayNo || company.currentFiscalDayNo) ? `<p>Fiscal Day No: ${invoice.fiscalDayNo || company.currentFiscalDayNo}</p>` : ''}
          ${displayField("Device Serial", company.deviceSerialNo)}
          ${displayField("Device ID", company.deviceId)}
          <p>Date: ${new Date(invoice.issueDate || invoice.createdAt).toLocaleString(undefined, {
            day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit'
          })}</p>
        </div>

        <div class="flex justify-between font-bold mb-1 border-b pb-1">
          <span class="w-45">Description</span>
          <span class="w-25 text-right">Amount</span>
          <span class="w-10 text-right">Tax</span>
        </div>

        <div class="mb-2 pb-2 border-b">
          ${receiptItems.map((item: any) => `
            <div class="mb-2">
              <div class="flex justify-between">
                <span class="w-60 font-bold">${item.description || item.name}</span>
                <span class="w-30 text-right font-bold">${Number(item.lineTotal || (item.price * item.quantity)).toFixed(2)}</span>
                <span class="w-10 text-right">${item.taxCode || (item.taxRate > 0 ? "VT" : "ZE")}</span>
              </div>
              <div class="text-9xs pl-2">
                ${Number(item.quantity)} x ${Number(item.unitPrice || item.price).toFixed(2)}
              </div>
            </div>
          `).join('')}
        </div>

        <div class="mb-2 pb-2 border-b font-bold">
          <div class="flex justify-between text-base">
            <span>Total ${invoice.currency || "USD"}</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div class="mb-2 pb-2 border-b">
          <div class="flex justify-between">
            <span>${invoice.paymentMethod || "Cash"}</span>
            <span>${paid.toFixed(2)}</span>
          </div>
          ${change > 0 ? `
            <div class="flex justify-between">
              <span>Change</span>
              <span>${change.toFixed(2)}</span>
            </div>
          ` : ''}
        </div>

        <div class="mb-2 pb-2 border-b text-center">
          <p>Number of Items: ${receiptItems.length}</p>
        </div>

        <div class="mb-2 pb-2 border-b">
          <p class="font-bold text-center mb-1">Tax Table</p>
          ${Object.values(taxGroups).map((group: any) => `
            <div class="mb-1">
              <div class="flex justify-between">
                <span>Net Amount</span>
                <span>${group.net.toFixed(2)}</span>
              </div>
              <div class="flex justify-between">
                <span>VAT (${group.name})</span>
                <span>${group.tax.toFixed(2)}</span>
              </div>
              <div class="flex justify-between font-bold border-dotted pb-1">
                <span>Gross Amount</span>
                <span>${group.gross.toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="text-center mb-2">
          <p>${invoice.notes || "Invoice is issued after purchasing goods"}</p>
        </div>

        ${qrUrl ? `
          <div class="flex flex-col items-center mb-2 mt-1">
            <img src="${qrUrl}" width="100" height="100" />
            ${invoice.verificationCode ? `
              <div class="text-center mt-1">
                <p>Verification Code:</p>
                <p class="font-bold">${invoice.verificationCode}</p>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="text-center italic text-9xs mt-1">
          <p>${company.posSettings?.receiptFooter || "Thank you for your business!"}</p>
          ${invoice._offline ? `
            <div class="offline-badge">
              <p>*** PENDING FISCALIZATION ***</p>
              <p style="font-weight: normal;">Will sync when online</p>
            </div>
          ` : `
            <p>*** FISCAL RECEIPT ***</p>
          `}
        </div>
      </body>
    </html>
  `;
}

export const printReceipt = async (data: TicketData, printerUrl?: string, silent?: boolean) => {
  try {
    const html = generateReceiptHtml(data);
    await Print.printAsync({
      html,
      printerUrl: printerUrl || undefined,
    });
  } catch (error) {
    console.error('[Printing] Standard print error:', error);
    throw error;
  }
};


export const printToBluetooth = async (data: TicketData, address?: string) => {
  try {
    const { invoice, company, items, currencySymbol, cashierName, paidAmount, paperWidth } = data;
    const receiptItems = items || invoice.items || [];
    const width = paperWidth || 58;
    const getMaxChars = (w: number) => {
      if (w >= 80) return 48;
      if (w >= 58) return 32;
      if (w >= 50) return 26;
      if (w >= 40) return 20;
      return 15; // 30mm safety limit
    };
    const maxChars = getMaxChars(width);
    const sep = "-".repeat(maxChars);
    
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
            acc[key] = {
                rate: taxRate,
                net: 0,
                tax: 0,
                gross: 0,
                name: item.taxCode || (taxRate === 0 ? "Exempt" : `${taxRate}%`)
            };
        }
        acc[key].net += netAmount;
        acc[key].tax += taxAmount;
        acc[key].gross += total;
        return acc;
    }, {});

    const totalVal = Number(invoice.total || 0);
    const paidVal = Number(paidAmount || totalVal);
    const changeVal = Math.max(0, paidVal - totalVal);

    const addField = (label: string, value: any) => {
      if (!value || value === "N/A" || value === "null / null") return "";
      return `[L]${label}: [R]${value}\n`;
    };

    let text = `[C]<b>${company.name}</b>\n`;
    text += `[C]TIN: ${company.tin}\n`;
    if (company.vatNumber) text += `[C]VAT: ${company.vatNumber}\n`;
    if (company.tradingName) text += `[C]${company.tradingName}\n`;
    text += `[C]${company.address}\n`;
    text += `[C]${company.city}\n`;
    text += `[C]${sep}\n`;
    if (company.email) text += `[C]${company.email}\n`;
    if (company.phone) text += `[C]${company.phone}\n`;
    text += `[C]${sep}\n`;
    text += `[C]<b>FISCAL TAX INVOICE</b>\n`;
    text += `[C]${sep}\n`;
    
    if (cashierName) text += `[L]Cashier: [R]${cashierName}\n`;
    text += addField("Invoice No", invoice.invoiceNumber || (invoice.id ? `#${invoice.id}` : null));
    if (invoice.receiptCounter && invoice.receiptCounter !== "N/A") {
        text += `[L]Receipt No: [R]${invoice.receiptCounter} / ${invoice.receiptGlobalNo || ""}\n`;
    }
    if (invoice.fiscalDayNo || company.currentFiscalDayNo) {
        text += `[L]Fiscal Day No: [R]${invoice.fiscalDayNo || company.currentFiscalDayNo}\n`;
    }
    text += addField("Device Serial", company.deviceSerialNo);
    text += addField("Device ID", company.deviceId);
    text += `[L]Date: [R]${new Date(invoice.issueDate || invoice.createdAt).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;
    text += `[C]${sep}\n`;
    
    text += `[L]<b>Description</b>[R]<b>Amount</b> Tax\n`;
    const rate = (invoice.currency !== 'USD' ? Number(invoice.exchangeRate || 1) : 1);

    receiptItems.forEach((item: any) => {
      const nameLimit = Math.max(5, maxChars - 12);
      const name = (item.description || item.name).slice(0, nameLimit);
      const qty = Number(item.quantity).toFixed(0);
      const total = (Number(item.lineTotal || (Number(item.price) * Number(item.quantity))) * rate).toFixed(2);
      const taxCode = item.taxCode || (item.taxRate > 0 ? "VT" : "ZE");
      
      text += `[L]<b>${name}</b>[R]<b>${total}</b> ${taxCode}\n`;
      text += `[L]  ${qty} x ${Number(item.unitPrice || item.price).toFixed(2)}\n`;
    });
    text += `[C]${sep}\n`;
    
    text += `[L]<b>Total ${invoice.currency || "USD"}</b>[R]<b>${(totalVal * rate).toFixed(2)}</b>\n`;
    text += `[C]${sep}\n`;
    text += `[L]${invoice.paymentMethod || "Cash"}[R]${(paidVal * rate).toFixed(2)}\n`;
    if (changeVal > 0) {
        text += `[L]Change[R]${(changeVal * rate).toFixed(2)}\n`;
    }
    text += `[C]${sep}\n`;
    text += `[C]Number of Items: ${receiptItems.length}\n`;
    text += `[C]${sep}\n`;
    
    text += `[C]<b>Tax Table</b>\n`;
    Object.values(taxGroups).forEach((group: any) => {
        text += `[L]Net[R]${group.net.toFixed(2)}\n`;
        text += `[L]VAT (${group.name})[R]${group.tax.toFixed(2)}\n`;
        text += `[L]<b>Gross Amount</b>[R]<b>${group.gross.toFixed(2)}</b>\n`;
        text += `[C] ${" - ".repeat(Math.floor(maxChars/3))} \n`;
    });
    
    text += `[C]${sep}\n`;
    text += `[C]${invoice.notes || "Invoice is issued after purchasing goods"}\n`;
    
    text += `[C]${sep}\n`;
    if (invoice.qrCodeData) {
        text += `[C][QR]${invoice.qrCodeData}\n`;
        if (invoice.verificationCode) {
            text += `[C]Verification Code:\n`;
            text += `[C]<b>${invoice.verificationCode}</b>\n`;
        }
    }
    
    text += `[C]${company.posSettings?.receiptFooter || "Thank you for your business!"}\n`;
    text += `[C]*** ${invoice._offline ? 'PENDING FISCALIZATION' : 'FISCAL RECEIPT'} ***\n`;
    text += `[C]Powered by Tagrain\n`;
    text += `\n\n\n`;

    await ThermalPrinterModule.printBluetooth({
      payload: text,
      macAddress: address,
    });
  } catch (error) {
    console.error('[Printing] Bluetooth print error:', error);
    throw error;
  }
}
