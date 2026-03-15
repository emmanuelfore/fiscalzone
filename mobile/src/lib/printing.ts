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
}


export const generateReceiptHtml = (data: TicketData) => {
  const { invoice, company, customer, items, currencySymbol } = data;
  const symbol = currencySymbol || '$';
  const receiptItems = items || invoice.items || [];
  
  const qrUrl = invoice.qrCodeData 
    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoice.qrCodeData)}&size=150x150`
    : null;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: 'Courier New', Courier, monospace;
            padding: 20px;
            color: black;
            font-size: 12px;
            line-height: 1.2;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .font-black { font-weight: 900; }
          .uppercase { text-transform: uppercase; }
          .space-y-1 > * { margin-bottom: 4px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-2 { margin-bottom: 8px; }
          .py-1 { padding-top: 4px; padding-bottom: 4px; }
          .py-2 { padding-top: 8px; padding-bottom: 8px; }
          .my-2 { margin-top: 8px; margin-bottom: 8px; }
          .border-y { border-top: 1px dashed black; border-bottom: 1px dashed black; }
          .border-b { border-bottom: 1px dashed black; }
          .border-t { border-top: 1px solid black; }
          .border-double { border-top: 3px double black; }
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .italic { font-style: italic; }
          .text-lg { font-size: 18px; }
          .text-base { font-size: 14px; }
          .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          th { border-bottom: 1px dashed black; text-align: left; padding-bottom: 5px; font-size: 10px; }
          td { padding: 4px 0; vertical-align: top; }
          .text-right { text-align: right; }
          
          .fiscal-box {
            font-size: 10px;
            background: #f9f9f9;
            padding: 8px;
            border: 1px dashed black;
            margin-bottom: 15px;
          }
          .qr-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 15px;
          }
          .offline-badge {
            border: 2px solid red;
            color: red;
            font-weight: 900;
            padding: 5px;
            text-align: center;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="text-center space-y-1 mb-4">
          <h1 class="text-lg font-black uppercase">${company.name}</h1>
          ${company.tradingName ? `<p class="font-bold">${company.tradingName}</p>` : ''}
          <p>${company.address}</p>
          <p>${company.city}</p>
          <p>Tel: ${company.phone}</p>
          <div class="border-y py-1 my-2">
            <p class="font-bold">TIN: ${company.tin}</p>
            ${company.vatNumber ? `<p class="font-bold">VAT: ${company.vatNumber}</p>` : ''}
          </div>
        </div>

        ${company.posSettings?.receiptHeader ? `
          <div class="text-center font-bold mb-2 border-b pb-1">
            <p>${company.posSettings.receiptHeader}</p>
          </div>
        ` : ''}

        <div class="mb-4 space-y-1">
          <div class="flex justify-between">
            <span>Invoice #:</span>
            <span class="font-bold">${invoice.invoiceNumber || `#${invoice.id}`}</span>
          </div>
          <div class="flex justify-between">
            <span>Date:</span>
            <span>${new Date(invoice.issueDate || invoice.createdAt).toLocaleString()}</span>
          </div>
          ${customer ? `
            <div class="flex justify-between">
              <span>Customer:</span>
              <span class="truncate">${customer.name}</span>
            </div>
          ` : ''}
          <div class="flex justify-between">
            <span>Method:</span>
            <span>${invoice.paymentMethod || 'CASH'}</span>
          </div>
          <div class="flex justify-between">
            <span>Currency:</span>
            <span>${invoice.currency || 'USD'} @ ${invoice.exchangeRate || '1'}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr class="italic">
              <th style="width: 50%">Item</th>
              <th style="width: 10%; text-align: center;">Qty</th>
              <th style="width: 20%; text-align: right;">Price</th>
              <th style="width: 20%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${receiptItems.map((item: any) => `
              <tr>
                <td>${item.description || item.name}</td>
                <td class="text-center">${Number(item.quantity).toFixed(0)}</td>
                <td class="text-right">${(Number(item.unitPrice || item.price) * (invoice.currency !== 'USD' ? Number(invoice.exchangeRate) : 1)).toFixed(2)}</td>
                <td class="text-right">${(Number(item.lineTotal || (Number(item.price) * Number(item.quantity))) * (invoice.currency !== 'USD' ? Number(invoice.exchangeRate) : 1)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="space-y-1 mb-4">
          <div class="flex justify-between">
            <span>Subtotal:</span>
            <span>${symbol}${(Number(invoice.subtotal) * (invoice.currency !== 'USD' ? Number(invoice.exchangeRate) : 1)).toFixed(2)}</span>
          </div>
          <div class="flex justify-between">
            <span>Tax:</span>
            <span>${symbol}${(Number(invoice.taxAmount) * (invoice.currency !== 'USD' ? Number(invoice.exchangeRate) : 1)).toFixed(2)}</span>
          </div>
          ${Number(invoice.discountAmount) > 0 ? `
            <div class="flex justify-between italic">
              <span>Discount:</span>
              <span>-${symbol}${(Number(invoice.discountAmount) * (invoice.currency !== 'USD' ? Number(invoice.exchangeRate) : 1)).toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="flex justify-between text-base font-black border-t border-double pt-1 uppercase">
            <span>Total:</span>
            <span>${symbol}${(Number(invoice.total) * (invoice.currency !== 'USD' ? Number(invoice.exchangeRate) : 1)).toFixed(2)}</span>
          </div>
          ${invoice.currency && invoice.currency !== "USD" ? `
            <div class="flex justify-between italic" style="font-size: 10px; margin-top: 4px;">
              <span>(Base USD Equivalent):</span>
              <span>$${Number(invoice.total).toFixed(2)}</span>
            </div>
          ` : ''}
        </div>

        <div class="fiscal-box space-y-1">
          <p class="text-center font-black mb-1">FISCAL DATA</p>
          <div class="flex justify-between">
            <span>FISCAL CODE:</span>
            <span>${invoice.fiscalCode || 'NOT FISCALIZED'}</span>
          </div>
          <div class="flex justify-between">
            <span>SIG:</span>
            <span class="truncate" style="max-width: 150px;">${invoice.fiscalSignature || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span>RCPT NO:</span>
            <span>${invoice.receiptCounter || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span>GLOBAL NO:</span>
            <span>${invoice.receiptGlobalNo || 'N/A'}</span>
          </div>
        </div>

        ${qrUrl ? `
          <div class="qr-container">
            <img src="${qrUrl}" width="120" height="120" />
            <p style="font-size: 8px; margin-top: 5px; font-style: italic;">Scan to verify with ZIMRA</p>
          </div>
        ` : ''}

        <div class="text-center space-y-1 italic" style="font-size: 9px;">
          <p>${company.posSettings?.receiptFooter || "Thank you for your business!"}</p>
          ${invoice._offline ? `
            <div class="offline-badge">
              *** PENDING FISCALIZATION ***
              <p style="font-size: 8px; font-weight: normal;">Offline Sale - Will sync once reconnected</p>
            </div>
          ` : `
            <p>*** FISCAL RECEIPT ***</p>
          `}
          <p>Powered by Tagrain</p>
        </div>
      </body>
    </html>
  `;
};

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
    // ThermalPrinterModule handles ESC/POS commands. 
    // It often expects a specific format (text with tags like [C], [L], [R] for alignment).
    // We'll build a simplified text representation for ESC/POS.
    
    const { invoice, company, customer, items, currencySymbol } = data;
    const receiptItems = items || invoice.items || [];
    
    let text = `[C]<b>${company.name}</b>\n`;
    if (company.tradingName) text += `[C]${company.tradingName}\n`;
    text += `[C]${company.address}\n`;
    text += `[C]${company.city}\n`;
    text += `[C]Tel: ${company.phone}\n`;
    text += `[C]------------------------------\n`;
    text += `[C]TIN: ${company.tin}\n`;
    if (company.vatNumber) text += `[C]VAT: ${company.vatNumber}\n`;
    text += `[C]------------------------------\n`;
    
    if (company.posSettings?.receiptHeader) {
        text += `[C]${company.posSettings.receiptHeader}\n`;
        text += `[C]------------------------------\n`;
    }
    
    text += `[L]Invoice #: [R]${invoice.invoiceNumber || `#${invoice.id}`}\n`;
    text += `[L]Date: [R]${new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()}\n`;
    if (customer) text += `[L]Customer: [R]${customer.name}\n`;
    text += `[L]Method: [R]${invoice.paymentMethod || 'CASH'}\n`;
    text += `[L]Currency: [R]${invoice.currency || 'USD'}\n`;
    text += `[C]------------------------------\n`;
    
    text += `[L]<b>Item</b>[R]<b>Qty</b>  <b>Total</b>\n`;
    const rate = (invoice.currency !== 'USD' ? Number(invoice.exchangeRate || 1) : 1);
    const symbol = currencySymbol || '$';

    receiptItems.forEach((item: any) => {
      const name = (item.description || item.name).slice(0, 15);
      const qty = Number(item.quantity).toFixed(0);
      const total = (Number(item.lineTotal || (Number(item.price) * Number(item.quantity))) * rate).toFixed(2);
      text += `[L]${name}[R]${qty}   ${symbol}${total}\n`;
    });
    text += `[C]------------------------------\n`;
    
    text += `[L]Subtotal:[R]${symbol}${(Number(invoice.subtotal) * rate).toFixed(2)}\n`;
    text += `[L]Tax:[R]${symbol}${(Number(invoice.taxAmount) * rate).toFixed(2)}\n`;
    if (Number(invoice.discountAmount) > 0) {
      text += `[L]Discount:[R]-${symbol}${(Number(invoice.discountAmount) * rate).toFixed(2)}\n`;
    }
    text += `[L]<b>TOTAL:</b>[R]<b>${symbol}${(Number(invoice.total) * rate).toFixed(2)}</b>\n`;
    
    if (invoice.currency && invoice.currency !== "USD") {
        text += `[L]Base Equivalent:[R]$${Number(invoice.total).toFixed(2)}\n`;
    }
    
    text += `[C]------------------------------\n`;
    text += `[C]FISCAL DATA\n`;
    text += `[L]CODE: [R]${invoice.fiscalCode || 'N/A'}\n`;
    text += `[L]RCPT: [R]${invoice.receiptCounter || 'N/A'}\n`;
    
    text += `[C]------------------------------\n`;
    if (invoice.qrCodeData) {
        // Some printers support [QR] tag
        text += `[C][QR]${invoice.qrCodeData}\n`;
    }
    text += `[C]${company.posSettings?.receiptFooter || "Thank you!"}\n`;
    text += `[C]*** ${invoice._offline ? 'PENDING SYNC' : 'FISCAL RECEIPT'} ***\n`;
    text += `[C]Powered by Tagrain\n`;
    text += `\n\n\n`; // Feed lines

    await ThermalPrinterModule.printBluetooth({
      payload: text,
      macAddress: address, // address is optional, if null it might prompt or use last
    });
  } catch (error) {
    console.error('[Printing] Bluetooth print error:', error);
    throw error;
  }
};
