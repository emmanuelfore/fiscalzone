
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

interface POSReceiptProps {
    invoice: any;
    company: any;
    customer?: any;
    items?: any[];
}

export function POSReceipt({ invoice, company, customer, items }: POSReceiptProps) {
    if (!invoice || !company) return null;

    const receiptItems = items || invoice.items || [];

    return (
        <div id="pos-receipt" className="w-[80mm] bg-white p-2 text-black font-mono text-[10px] leading-tight">
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

            {/* Fiscal Data */}
            <div className="text-[8px] space-y-1 border-y border-dashed py-2 mb-4 font-bold bg-slate-50 p-2 break-inside-avoid">
                <p className="text-center font-black mb-1">FISCAL DATA</p>
                <div className="flex justify-between">
                    <span>FISCAL CODE:</span>
                    <span className="font-mono">{invoice.fiscalCode || 'NOT FISCALIZED'}</span>
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
                <p>*** FISCAL RECEIPT ***</p>
                <p>Powered by Fisczim SaaS</p>
            </div>

            <style>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
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
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 79mm; /* Slightly less than 80mm to prevent spillover */
                        padding: 4mm;
                        margin: 0 auto;
                        background: white;
                    }
                }
            `}</style>
        </div>
    );
}
