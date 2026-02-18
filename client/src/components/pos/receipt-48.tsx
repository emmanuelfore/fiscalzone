
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";

interface Receipt48Props {
    id?: string;
    invoice: any;
    company: any;
    customer?: any;
    items?: any[];
    originalInvoice?: any; // For Credit/Debit notes
    user?: any;
}

export function Receipt48({ id = "receipt-48", invoice, company, customer, items, originalInvoice, user }: Receipt48Props) {
    if (!invoice || !company) return null;

    const receiptItems = items || invoice.items || [];

    // Group taxes
    const taxGroups = receiptItems.reduce((acc: any, item: any) => {
        const taxRate = parseFloat(item.taxRate || 0);
        const price = parseFloat(item.price || 0);
        const qty = parseFloat(item.quantity || 0);
        const total = parseFloat(item.lineTotal || (price * qty));

        // Calculate tax amount based on inclusive/exclusive logic (assuming inclusive for POS usually)
        // Adjust logic if needed based on system settings
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

    const isCreditNote = invoice.transactionType === 'CreditNote' || invoice.type === 'credit_note';
    const isDebitNote = invoice.transactionType === 'DebitNote' || invoice.type === 'debit_note';
    const documentTitle = isCreditNote ? "CREDIT NOTE" : isDebitNote ? "DEBIT NOTE" : "FISCAL TAX INVOICE";

    return (
        <div id={id} className="w-[80mm] bg-white p-2 text-black font-mono text-[10px] leading-tight">
            {/* [1] Logo (Placeholder if URL exists) */}
            {company.logoUrl && (
                <div className="flex justify-center mb-2">
                    <img src={company.logoUrl} alt="Logo" className="max-h-16 object-contain" />
                </div>
            )}

            {/* [2] Company Name */}
            <h1 className="text-center font-bold uppercase text-xs mb-1">{company.name}</h1>

            {/* [3] TIN, [4] VAT */}
            <div className="text-center mb-1">
                <p>TIN: {company.tin}</p>
                {company.vatNumber && <p>VAT No: {company.vatNumber}</p>}
            </div>

            {/* [5] Branch Name & [6] Address */}
            <div className="text-center mb-1">
                <p>{company.tradingName || "Branch Name"}</p>
                <p className="whitespace-pre-wrap">{company.address}</p>
                <p>{company.city}</p>
            </div>

            {/* [7] Email, [8] Phone */}
            <div className="text-center mb-2 pb-2 border-b border-dashed border-black">
                {company.email && <p>{company.email}</p>}
                {company.phone && <p>{company.phone}</p>}
            </div>

            {/* [9] Static Text */}
            <div className="text-center font-bold mb-2 pb-2 border-b border-dashed border-black">
                <p>{documentTitle}</p>
            </div>

            {/* [10] Buyer Info */}
            {customer && (
                <div className="mb-2 pb-2 border-b border-dashed border-black">
                    <p className="font-bold">Buyer:</p>
                    <p>{customer.name}</p> {/* [11] */}
                    {customer.tin && <p>TIN: {customer.tin}</p>} {/* [13] */}
                    {customer.vatNumber && <p>VAT: {customer.vatNumber}</p>} {/* [51] */}
                    {customer.address && <p>{customer.address}</p>} {/* [14] */}
                    {customer.email && <p>{customer.email}</p>} {/* [15] */}
                    {customer.phone && <p>{customer.phone}</p>} {/* [16] */}
                </div>
            )}

            {/* Invoice Details */}
            <div className="mb-2 pb-2 border-b border-dashed border-black">
                <p>Invoice No: {invoice.invoiceNumber}</p>
                <p>Receipt No: {invoice.receiptCounter || "N/A"} / {invoice.receiptGlobalNo || "N/A"}</p>
                <p>Fiscal Day No: {invoice.fiscalDayNo || "N/A"}</p>
                {invoice.customerReference && <p>Customer Ref: {invoice.customerReference}</p>} {/* [20] */}
                <p>Device Serial: {company.deviceSerialNo || "N/A"}</p> {/* [21] */}
                <p>Device ID: {company.deviceId || "N/A"}</p> {/* [22] */}
                <p>Date: {format(new Date(invoice.issueDate), "dd/MM/yy HH:mm")}</p> {/* [23] */}
                {user && <p>Cashier: {user.name || user.username || user.email}</p>}

                {/* Credit/Debit Note Specifics */}
                {(isCreditNote || isDebitNote) && (originalInvoice || invoice.originalInvoiceNumber) && (
                    <div className="mt-1">
                        <p className="font-bold">{isCreditNote ? "Credited Invoice" : "Debited Invoice"}</p>
                        <p>Device Serial: {originalInvoice?.deviceSerialNo || company.deviceSerialNo}</p>
                        <p>Invoice No: {originalInvoice?.invoiceNumber || invoice.originalInvoiceNumber}</p>
                        {originalInvoice?.issueDate && (
                            <p>Date: {format(new Date(originalInvoice.issueDate), "dd/MM/yy HH:mm")}</p>
                        )}
                    </div>
                )}
            </div>

            {/* Items Header */}
            <div className="flex justify-between font-bold mb-1 border-b border-dashed border-black pb-1">
                <span className="w-[45%]">Description</span>
                <span className="w-[25%] text-right">Amount</span>
                <span className="w-[10%] text-right">Tax</span>
            </div>

            {/* Items List */}
            <div className="mb-2 pb-2 border-b border-dashed border-black">
                {receiptItems.map((item: any, i: number) => (
                    <div key={i} className="mb-2">
                        <div className="flex justify-between">
                            <span className="w-[60%] font-bold">{item.description || item.name}</span>
                            <span className="w-[30%] text-right font-bold">
                                {Number(item.lineTotal || (item.price * item.quantity)).toFixed(2)}
                            </span>
                            <span className="w-[10%] text-right">{item.taxCode || (item.taxRate > 0 ? "VT" : "ZE")}</span>
                        </div>
                        {/* Qty line */}
                        <div className="text-[9px] pl-2">
                            {Number(item.quantity)} x {Number(item.unitPrice || item.price).toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="mb-2 pb-2 border-b border-dashed border-black font-bold">
                <div className="flex justify-between text-base">
                    <span>Total {invoice.currency || "USD"}</span>
                    <span>{Number(invoice.total).toFixed(2)}</span>
                </div>
            </div>

            {/* Payments */}
            <div className="mb-2 pb-2 border-b border-dashed border-black">
                {/* Simplified payment display - assumes invoice has payment method or separate payments list */}
                <div className="flex justify-between">
                    <span>{invoice.paymentMethod || "Cash"}</span>
                    <span>{Number(invoice.total).toFixed(2)}</span>
                </div>
            </div>

            {/* Item Count */}
            <div className="mb-2 pb-2 border-b border-dashed border-black text-center">
                <p>Number of Items: {receiptItems.length}</p>
            </div>

            {/* Tax Table */}
            <div className="mb-2 pb-2 border-b border-dashed border-black">
                <p className="font-bold text-center mb-1">Tax Table</p>
                {Object.values(taxGroups).map((group: any, i) => (
                    <div key={i} className="mb-1">
                        <div className="flex justify-between">
                            <span>Net Amount</span>
                            <span>{group.net.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>VAT ({group.name})</span>
                            <span>{group.tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-b border-dotted border-gray-400">
                            <span>Gross Amount</span>
                            <span>{group.gross.toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Text */}
            <div className="text-center mb-2">
                <p>{invoice.notes || "Invoice is issued after purchasing goods"}</p>
            </div>

            {invoice.qrCodeData && (
                <div className="flex flex-col items-center gap-1 mb-2">
                    <QRCodeSVG value={invoice.qrCodeData} size={100} level="M" />
                    {invoice.verificationCode && (
                        <div className="text-center mt-1">
                            <p>Verification Code:</p>
                            <p className="font-bold">{invoice.verificationCode}</p>
                        </div>
                    )}
                </div>
            )}


            <style>{`
                @media print {
                    @page { 
                        size: 80mm auto; 
                        margin: 0; 
                    }
                    body { 
                        margin: 0; 
                        padding: 0; 
                        background: white;
                    }
                    #receipt-48 {
                        width: 76mm;
                        margin: 0 auto;
                        padding: 2mm;
                        background: white;
                    }
                }
            `}</style>
        </div>
    );
}
