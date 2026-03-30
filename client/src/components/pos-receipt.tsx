
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

interface POSReceiptProps {
    invoice: any;
    company: any;
    customer?: any;
    items?: any[];
    paperSize?: '80mm' | '58mm' | 'A4';
}

export function POSReceipt({ invoice, company, customer, items, paperSize: paperSizeProp }: POSReceiptProps) {
    if (!invoice || !company) return null;

    const receiptItems = items || invoice.items || [];
    const paperSize = paperSizeProp || (company.posSettings?.paperSize as string) || '80mm';
    const isA4 = paperSize === 'A4';
    const receiptWidth = isA4 ? '210mm' : paperSize;

    return (
        <div id="pos-receipt" style={{ width: receiptWidth }} className={`bg-white p-2 text-black font-mono text-[10px] leading-tight ${isA4 ? 'mx-auto' : ''}`}>
            {/* Header */}
            <div className="text-center space-y-1 mb-4">
                <h1 className="text-lg font-black uppercase text-center w-full">{company.name}</h1>
                {company.tradingName && <p className="font-bold">{company.tradingName}</p>}
                <p>{company.address}</p>
                <p>{company.city}</p>
                <p>Tel: {company.phone}</p>
                <div className="border-y border-dashed py-1 my-2">
                    <p className="font-bold">TIN: {company.tin}</p>
                    {company.vatNumber && <p className="font-bold">VAT: {company.vatNumber}</p>}
                </div>
            </div>

            {/* Optional Custom Header */}
            {company.posSettings?.receiptHeader && (
                <div className="text-center font-bold mb-2 break-inside-avoid border-b pb-1">
                    <p>{company.posSettings.receiptHeader}</p>
                </div>
            )}

            {/* Invoice Info */}
            <div className="mb-4 space-y-1">
                <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <span className="font-bold">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{new Date(invoice.issueDate).toLocaleString()}</span>
                </div>
                {customer && (
                    <div className="flex justify-between">
                        <span>Customer:</span>
                        <span className="truncate max-w-[120px]">{customer.name}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>Method:</span>
                    <span>{invoice.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                    <span>Currency:</span>
                    <span>{invoice.currency} @ {invoice.exchangeRate}</span>
                </div>
                {invoice.tableId && (
                    <div className="flex justify-between border-t border-dashed pt-1 mt-1 font-bold">
                        <span>TABLE:</span>
                        <span>{invoice.notes?.includes("Table: ") ? invoice.notes.split("Table: ")[1] : invoice.tableId}</span>
                    </div>
                )}
                {invoice.waiterId && (
                    <div className="flex justify-between font-bold">
                        <span>WAITER:</span>
                        <span>{invoice.waiterId.toString().slice(0, 8)}</span>
                    </div>
                )}
            </div>

            {/* Items */}
            <div className="border-b border-dashed mb-2 pb-1">
                <div className="flex font-bold mb-1 italic text-[9px]">
                    <span className="flex-[2]">Item</span>
                    <span className="w-8 text-center">Qty</span>
                    <span className="w-12 text-right">Price</span>
                    <span className="w-12 text-right">Total</span>
                </div>
                {receiptItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex mb-1">
                        <span className="flex-[2] truncate">{item.description || item.name}</span>
                        <span className="w-8 text-center">{Number(item.quantity).toFixed(0)}</span>
                        <span className="w-12 text-right">{Number(item.unitPrice || item.price).toFixed(2)}</span>
                        <span className="w-12 text-right">{Number(item.lineTotal || (Number(item.price) * Number(item.quantity))).toFixed(2)}</span>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 mb-4">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${Number(invoice.taxAmount).toFixed(2)}</span>
                </div>
                {Number(invoice.discountAmount) > 0 && (
                    <div className="flex justify-between italic">
                        <span>Discount:</span>
                        <span>-${Number(invoice.discountAmount).toFixed(2)}</span>
                    </div>
                )}
                <div className="flex justify-between text-base font-black border-t border-double pt-1 uppercase">
                    <span>Total USD:</span>
                    <span>${Number(invoice.total).toFixed(2)}</span>
                </div>
                {invoice.currency !== "USD" && (
                    <div className="flex justify-between text-base font-black border-t pt-1">
                        <span>Total {invoice.currency}:</span>
                        <span>{(Number(invoice.total) * Number(invoice.exchangeRate)).toFixed(2)}</span>
                    </div>
                )}
            </div>

            {/* Fiscal Data — only shown when fiscalized */}
            {invoice.fiscalCode && (
                <div className="text-[8px] space-y-1 border-y border-dashed py-2 mb-4 font-bold bg-slate-50 p-2 break-inside-avoid">
                    <p className="text-center font-black mb-1">FISCAL DATA</p>
                    <div className="flex justify-between">
                        <span>FISCAL CODE:</span>
                        <span className="font-mono">{invoice.fiscalCode}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>SIG:</span>
                        <span className="font-mono truncate max-w-[150px]">{invoice.fiscalSignature || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>RCPT NO:</span>
                        <span className="font-mono">{invoice.receiptCounter || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>GLOBAL NO:</span>
                        <span className="font-mono">{invoice.receiptGlobalNo || 'N/A'}</span>
                    </div>
                </div>
            )}

            {/* Pending fiscalization notice for offline sales */}
            {!invoice.fiscalCode && invoice._offline && (
                <div className="text-[8px] border-y border-dashed py-2 mb-4 text-center">
                    <p className="font-black text-red-600">PENDING FISCALIZATION</p>
                    <p className="text-[7px]">Offline sale — will sync when reconnected</p>
                </div>
            )}

            {/* QR Code */}
            {invoice.qrCodeData && (
                <div className="flex flex-col items-center gap-2 mb-4 break-inside-avoid">
                    <QRCodeSVG value={invoice.qrCodeData} size={100} level="H" />
                    <p className="text-[7px] text-center italic">Scan to verify with ZIMRA</p>
                </div>
            )}

            {/* Footer */}
            <div className="text-center space-y-1 text-[8px] italic break-inside-avoid">
                <p>{company.posSettings?.receiptFooter || "Thank you for your business!"}</p>
                {invoice._offline ? (
                    <p className="font-black not-italic">*** OFFLINE SALE ***</p>
                ) : invoice.fiscalCode ? (
                    <p>*** FISCAL RECEIPT ***</p>
                ) : null}
                <p>Powered by Fisczim SaaS</p>
            </div>

            <style>{`
                @media print {
                    @page {
                        size: ${isA4 ? 'A4' : `${receiptWidth} auto`};
                        margin: 0mm;
                    }
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: ${isA4 ? '210mm' : receiptWidth} !important;
                    }
                    body * {
                        visibility: hidden;
                        height: 0;
                        overflow: hidden;
                    }
                    #pos-receipt, #pos-receipt * {
                        visibility: visible;
                        height: auto;
                        overflow: visible;
                    }
                    #pos-receipt {
                        position: relative !important;
                        left: 0 !important;
                        top: 0 !important;
                        transform: none !important;
                        width: ${receiptWidth} !important;
                        padding: 4mm 4mm 1mm 4mm !important;
                        margin: ${isA4 ? '0 auto' : '0'} !important;
                        box-sizing: border-box;
                        background: white;
                        /* Force crisp rendering for thermal printers */
                        -webkit-font-smoothing: none;
                        -moz-osx-font-smoothing: grayscale;
                        color: #000000 !important;
                    }
                    * { 
                        box-sizing: border-box;
                        color: #000000 !important;
                        border-color: #000000 !important;
                    }
                    img, svg {
                        image-rendering: pixelated;
                        image-rendering: crisp-edges;
                    }
                }
            `}</style>
        </div>
    );
}
