import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { useRef } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { PaymentReceiptPDF } from "./payment-receipt-pdf";

import { useTaxConfig } from "@/hooks/use-tax-config";

interface PaymentReceiptProps {
  open: boolean;
  onClose: () => void;
  payment: {
    amount: string | number;
    paymentMethod: string;
    reference?: string;
    notes?: string;
    currency?: string;
    createdAt?: string;
  };
  invoice: any; // Accept full invoice object
  company: any;
  customer?: any;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card / Swipe",
  ECOCASH: "EcoCash / Mobile",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};

export function PaymentReceipt({ open, onClose, payment, invoice, company, customer }: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { taxTypes } = useTaxConfig(company?.id || 0);

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            @media print {
              @page { margin: 0; size: auto; }
              body { margin: 0; padding: 0; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 11px; 
              margin: 0; 
              padding: 8px; 
              color: #000; 
              overflow: visible !important;
              height: auto !important;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .row { display: flex; justify-content: space-between; margin-bottom: 3px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .title { font-size: 14px; font-weight: bold; text-transform: uppercase; }
            .small { font-size: 9px; }
          </style>
        </head>
        <body style="overflow: visible; height: auto;">${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const currency = payment.currency || invoice?.currency || "USD";
  const date = payment.createdAt ? format(new Date(payment.createdAt), "dd MMM yyyy HH:mm") : format(new Date(), "dd MMM yyyy HH:mm");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
          <DialogDescription className="sr-only">View and print or download your payment receipt.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <PDFDownloadLink
              document={
                <PaymentReceiptPDF
                  payment={{
                    amount: payment.amount,
                    paymentMethod: payment.paymentMethod,
                    reference: payment.reference,
                    notes: payment.notes,
                    currency: currency,
                    paymentDate: payment.createdAt || new Date(),
                    invoiceNumber: invoice?.invoiceNumber,
                    customerName: customer?.name || invoice?.customer?.name,
                    customerEmail: customer?.email || invoice?.customer?.email,
                    id: (payment as any).id || 0
                  }}
                  company={company}
                  invoice={invoice}
                  taxTypes={taxTypes.data || []}
                />
              }
              fileName={`Receipt-${invoice?.invoiceNumber || "NEW"}-${format(new Date(), "yyyyMMdd")}.pdf`}
            >
              {({ loading }) => (
                <Button size="sm" variant="outline" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                  Download PDF
                </Button>
              )}
            </PDFDownloadLink>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
          </div>
        </div>

        {/* Receipt preview */}
        <div
          ref={receiptRef}
          className="font-mono text-[11px] leading-snug border border-dashed border-slate-300 rounded p-4 bg-white text-black space-y-1"
        >
          {/* Header */}
          <div className="center text-center space-y-0.5 mb-3">
            <p className="title font-black text-sm uppercase">{company?.name}</p>
            {company?.tradingName && <p className="font-semibold">{company.tradingName}</p>}
            {company?.address && <p>{company.address}</p>}
            {company?.city && <p>{company.city}</p>}
            {company?.phone && <p>Tel: {company.phone}</p>}
            {company?.tin && <p>TIN: {company.tin}</p>}
            {company?.vatNumber && <p>VAT: {company.vatNumber}</p>}
          </div>

          <div className="border-t border-dashed border-black my-2" />

          <p className="text-center font-black uppercase text-sm">PAYMENT RECEIPT</p>

          <div className="border-t border-dashed border-black my-2" />

          {/* Details */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Date:</span>
              <span className="font-semibold">{date}</span>
            </div>
            <div className="flex justify-between">
              <span>Invoice #:</span>
              <span className="font-semibold">{invoice.invoiceNumber}</span>
            </div>
            {customer?.name && (
              <div className="flex justify-between">
                <span>Customer:</span>
                <span className="font-semibold truncate max-w-[140px]">{customer.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="font-semibold">{METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}</span>
            </div>
            {payment.reference && (
              <div className="flex justify-between">
                <span>Reference:</span>
                <span className="font-semibold">{payment.reference}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed border-black my-2" />

          <div className="flex justify-between text-sm font-black">
            <span>AMOUNT PAID:</span>
            <span>{currency} {Number(payment.amount).toFixed(2)}</span>
          </div>

          <div className="border-t border-dashed border-black my-2" />

          {payment.notes && (
            <p className="text-[10px] italic text-center">{payment.notes}</p>
          )}

          <p className="text-center text-[10px] italic mt-2">Thank you for your payment!</p>
        </div>

        <div className="flex justify-end mt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
