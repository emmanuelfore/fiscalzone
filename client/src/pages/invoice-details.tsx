import { Layout } from "@/components/layout";
import { useInvoice, useFiscalizeInvoice, useUpdateInvoice, useCreateCreditNote, useCreateDebitNote, usePayments, useConvertQuotation } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Printer, Send, ShieldCheck, Loader2, Download, Undo2, ClipboardList } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoices/pdf-document";
import { useCompany } from "@/hooks/use-companies";
import QRCode from 'qrcode';
import { useState, useEffect } from "react";
import { PaymentModal } from "@/components/invoices/payment-modal";
import { EmailInvoiceDialog } from "@/components/invoices/email-invoice-dialog";
import { pdf } from "@react-pdf/renderer";
import { apiFetch } from "@/lib/api";

import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function InvoiceDetailsPage() {
  const [, params] = useRoute("/invoices/:id");
  const [, setLocation] = useLocation();
  const invoiceId = parseInt(params?.id || "0");
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: company } = useCompany(invoice?.companyId || 0);
  const fiscalize = useFiscalizeInvoice();
  const { data: payments } = usePayments(invoiceId);
  const updateInvoice = useUpdateInvoice();
  const createCreditNote = useCreateCreditNote();
  const createDebitNote = useCreateDebitNote();
  const convertQuotation = useConvertQuotation();
  const { toast } = useToast();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const totalPaid = payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  // Use a small epsilon for float comparison safety or just rely on fixed point logic in backend
  const balanceDue = Math.max(0, Number(invoice?.total || 0) - totalPaid);
  const isPaid = balanceDue <= 0.01; // Tolerance for float math

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (invoice?.qrCodeData) {
      QRCode.toDataURL(invoice.qrCodeData)
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error("QR Generation Error", err));
    }
  }, [invoice?.qrCodeData]);

  const handleIssue = async () => {
    try {
      if (!invoice) return;

      const invoiceNumber = invoice.invoiceNumber.startsWith('DRAFT')
        ? `INV-${Date.now().toString().slice(-6)}`
        : invoice.invoiceNumber;

      await updateInvoice.mutateAsync({
        id: invoiceId,
        data: {
          status: "issued",
          invoiceNumber: invoiceNumber
        }
      });
      toast({
        title: "Invoice Issued",
        description: "Invoice has been issued successfully.",
      });
    } catch (error) {
      console.error("Failed to issue invoice:", error);
    }
  };

  const handleCreateCreditNote = async () => {
    if (!invoice) return;
    try {
      const newCN = await createCreditNote.mutateAsync(invoiceId);
      setLocation(`/invoices/new?edit=${newCN.id}`);
    } catch (error) {
      console.error("Failed to create credit note", error);
    }
  }

  const handleCreateDebitNote = async () => {
    if (!invoice) return;
    try {
      const newDN = await createDebitNote.mutateAsync(invoiceId);
      setLocation(`/invoices/new?edit=${newDN.id}`);
    } catch (error) {
      console.error("Failed to create debit note", error);
    }
  }

  const handleSendEmail = async (email: string) => {
    if (!invoice || !company) return;
    try {
      setIsSendingEmail(true);

      // Generate PDF Blob
      const doc = (
        <InvoicePDF
          invoice={invoice}
          company={company}
          customer={invoice.customer}
          qrCodeUrl={qrCodeDataUrl}
        />
      );
      const blob = await pdf(doc).toBlob();

      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result;

        // Send to Backend
        const res = await apiFetch(`/api/invoices/${invoiceId}/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, pdfBase64: base64data }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to send email");
        }

        toast({
          title: "Email Sent",
          description: `Invoice has been sent to ${email}`,
          className: "bg-emerald-600 text-white"
        });
        setShowEmailDialog(false);
        setIsSendingEmail(false);
      };
    } catch (error: any) {
      console.error("Failed to send email:", error);
      toast({
        title: "Email Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!invoice) return <Layout>Invoice not found</Layout>;

  // Extract Verification Code (Last 16 chars of QR Data)
  const verificationCodeRaw = invoice.qrCodeData ? invoice.qrCodeData.slice(-16) : "";
  const verificationCode = verificationCodeRaw.match(/.{1,4}/g)?.join("-") || "";

  const isCreditNote = invoice.transactionType === 'CreditNote';
  const isDebitNote = invoice.transactionType === 'DebitNote';

  // Calculate Tax Summary (ZIMRA Field [40-44])
  const taxSummary = invoice.items.reduce((acc, item) => {
    const taxRate = Number(item.product?.taxRate || 0);
    const lineTotal = Number(item.lineTotal);

    let netAmount = 0;
    let taxAmount = 0;

    if (invoice.taxInclusive) {
      // Tax inclusive: extract tax from total
      netAmount = lineTotal / (1 + taxRate / 100);
      taxAmount = lineTotal - netAmount;
    } else {
      // Tax exclusive: add tax to total
      netAmount = lineTotal;
      taxAmount = lineTotal * (taxRate / 100);
    }

    const key = taxRate.toString();
    if (!acc[key]) {
      acc[key] = { taxRate, netAmount: 0, taxAmount: 0, totalAmount: 0 };
    }

    acc[key].netAmount += netAmount;
    acc[key].taxAmount += taxAmount;
    acc[key].totalAmount += netAmount + taxAmount;

    return acc;
  }, {} as Record<string, { taxRate: number; netAmount: number; taxAmount: number; totalAmount: number }>);

  // Calculate Number of Items (ZIMRA Field [39])
  const numberOfItems = invoice.items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation(invoice?.status === 'quote' ? "/quotations" : "/invoices")}
            className="mb-2 pl-0 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to {invoice?.status === 'quote' ? "Quotations" : "Invoices"}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-slate-900">
              {invoice.status === 'quote' ? "Quotation" : (isCreditNote ? "Credit Note" : "Invoice")} {invoice.invoiceNumber}
            </h1>
            <StatusBadge status={invoice.status!} />
          </div>
        </div>

        <div className="flex gap-2">
          {/* PDF Download - For Pending (Issued/Paid) and Fiscalized */}
          {["issued", "paid", "fiscalized"].includes(invoice.status || "") && invoice && company && (
            <>
              <Button
                variant="outline"
                className="bg-white"
                onClick={() => setShowEmailDialog(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                Email
              </Button>

              <PDFDownloadLink
                document={
                  <InvoicePDF
                    invoice={invoice}
                    company={company}
                    customer={invoice.customer}
                    qrCodeUrl={qrCodeDataUrl}
                  />
                }
                fileName={`${isCreditNote ? "CreditNote" : "Invoice"}-${invoice.invoiceNumber}.pdf`}
              >
                {({ loading }) => (
                  <Button variant="outline" className="bg-white" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Download PDF
                  </Button>
                )}
              </PDFDownloadLink>
            </>
          )}

          {/* Issue Credit Note - For Issued, Paid, or Fiscalized */}
          {!isCreditNote && !isDebitNote && ["issued", "paid", "fiscalized"].includes(invoice.status || "") && (
            <Button
              variant="outline"
              className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200"
              onClick={handleCreateCreditNote}
              disabled={createCreditNote.isPending || createDebitNote.isPending}
            >
              {createCreditNote.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Undo2 className="w-4 h-4 mr-2" />}
              Issue Credit Note
            </Button>
          )}

          {/* Issue Debit Note - For Issued, Paid, or Fiscalized */}
          {!isCreditNote && !isDebitNote && ["issued", "paid", "fiscalized"].includes(invoice.status || "") && (
            <Button
              variant="outline"
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 border-blue-200"
              onClick={handleCreateDebitNote}
              disabled={createDebitNote.isPending || createCreditNote.isPending}
            >
              {createDebitNote.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Issue Debit Note
            </Button>
          )}

          {/* Record Payment - For Issued or Fiscalized (if not paid) */}
          {!isPaid && ["issued", "fiscalized"].includes(invoice.status || "") && (
            <Button
              variant="outline"
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
              onClick={() => setShowPaymentModal(true)}
            >
              Record Payment
            </Button>
          )}

          {/* Fiscalize - For Issued or Paid (not yet fiscalized) */}
          {["issued", "paid"].includes(invoice.status || "") && !invoice.fiscalCode && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              onClick={() => fiscalize.mutate(invoiceId)}
              disabled={fiscalize.isPending}
            >
              {fiscalize.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Fiscalize {isCreditNote ? "Credit Note" : "Invoice"}
            </Button>
          )}

          {/* Quotation Actions */}
          {invoice.status === "quote" && (
            <>
              <Button
                variant="outline"
                className="bg-white"
                onClick={() => setLocation(`/quotations/new?edit=${invoiceId}`)}
              >
                Edit Quotation
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => convertQuotation.mutate(invoiceId)}
                disabled={convertQuotation.isPending}
              >
                {convertQuotation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                Convert to Invoice
              </Button>
            </>
          )}

          {/* Draft Actions */}
          {invoice.status === "draft" && (
            <>
              <Button
                variant="outline"
                onClick={() => setLocation(`/invoices/new?edit=${invoiceId}`)}
              >
                Edit Draft
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={handleIssue}
                disabled={updateInvoice.isPending}
              >
                {updateInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Issue {isCreditNote ? "Credit Note" : "Invoice"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="border-none shadow-xl bg-white overflow-hidden print:shadow-none print:border">
          <CardContent className="p-10 font-mono text-sm">

            {/* 1. Verification Block */}
            {invoice.fiscalCode && (
              <div className="text-center border-b-2 border-slate-100 pb-6 mb-8 bg-slate-50/50 -mx-10 -mt-10 pt-10 px-10">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Verification Code</p>
                <p className="font-bold text-lg tracking-wider font-mono text-emerald-600 mb-2">{verificationCode}</p>
                <p className="text-xs text-slate-500">
                  Verify at <a href="https://receipt.zimra.org" target="_blank" className="underline hover:text-emerald-600">https://receipt.zimra.org</a>
                </p>
              </div>
            )}

            {/* 2. Seller & Buyer */}
            <div className="grid grid-cols-2 gap-12 mb-10">
              {/* Seller */}
              <div className="border-r border-slate-100 pr-8">
                <h3 className="font-bold text-slate-900 text-base uppercase mb-4 border-b pb-2">Seller</h3>
                <div className="space-y-1.5 text-slate-600">
                  {company ? (
                    <>
                      {company.logoUrl && (
                        <img
                          src={company.logoUrl}
                          alt="Company Logo"
                          className="h-16 w-auto object-contain mb-4"
                        />
                      )}
                      <p className="font-bold text-lg text-slate-800">{company.name}</p>
                      {company.branchName && company.branchName !== company.name && (
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-tight -mt-1 mb-1">
                          Branch: {company.branchName}
                        </p>
                      )}
                      <p className="font-medium text-slate-800">{company.tradingName && company.tradingName !== company.name ? `(${company.tradingName})` : ""}</p>
                      <p>{company.address}</p>
                      <p>{company.city}, {company.country}</p>
                      <div className="pt-2 space-y-1">
                        <p><span className="font-semibold text-slate-400 w-24 inline-block">TIN:</span> {company.tin}</p>
                        <p><span className="font-semibold text-slate-400 w-24 inline-block">VAT No:</span> {company.vatNumber || "N/A"}</p>
                        <p><span className="font-semibold text-slate-400 w-24 inline-block">Email:</span> {company.email}</p>
                        <p><span className="font-semibold text-slate-400 w-24 inline-block">Phone:</span> {company.phone}</p>
                      </div>
                    </>
                  ) : <p className="text-red-500">Company Details Unavailable</p>}
                </div>
              </div>

              {/* Buyer */}
              <div>
                <h3 className="font-bold text-slate-900 text-base uppercase mb-4 border-b pb-2">Buyer</h3>
                <div className="space-y-1.5 text-slate-600">
                  {invoice.customer ? (
                    <>
                      <p className="font-bold text-lg text-slate-800">{invoice.customer.name}</p>
                      <p>{invoice.customer.address || "No Address Provided"}</p>
                      <p>{invoice.customer.city} {invoice.customer.country}</p>
                      <div className="pt-2 space-y-1">
                        <p><span className="font-semibold text-slate-400 w-24 inline-block">TIN:</span> {invoice.customer.tin || "N/A"}</p>
                        <p><span className="font-semibold text-slate-400 w-24 inline-block">VAT No:</span> {invoice.customer.vatNumber || "N/A"}</p>
                        {invoice.customer.email && <p><span className="font-semibold text-slate-400 w-24 inline-block">Email:</span> {invoice.customer.email}</p>}
                      </div>
                    </>
                  ) : <p className="italic text-slate-400">Walk-in Customer</p>}
                </div>
              </div>
            </div>

            {/* 3. Header Info */}
            <div className="bg-slate-50 rounded-lg p-6 mb-10 border border-slate-100">
              <div className="grid grid-cols-2 gap-y-4 gap-x-12">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">{isCreditNote ? "Credit Note No:" : (isDebitNote ? "Debit Note No:" : "Invoice No:")}</span>
                    <span className="font-bold text-slate-900">
                      {invoice.receiptCounter && invoice.receiptGlobalNo
                        ? `${invoice.receiptCounter}/${invoice.receiptGlobalNo}`
                        : invoice.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Customer Reference No:</span>
                    <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Global No:</span>
                    <span className="font-bold text-slate-900">{invoice.receiptGlobalNo || invoice.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Fiscal Day:</span>
                    <span className="font-bold text-slate-900">{invoice.fiscalDayNo || "N/A"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Date:</span>
                    <span className="font-bold text-slate-900">{new Date(invoice.issueDate || new Date()).toLocaleString('en-GB')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Device ID:</span>
                    <span className="font-bold text-slate-900">{company?.fdmsDeviceId || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Device Serial No:</span>
                    <span className="font-bold text-slate-900">{company?.fdmsDeviceSerialNo || "N/A"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Currency:</span>
                    <span className="font-bold text-slate-900">{invoice.currency || "USD"}</span>
                  </div>
                </div>
              </div>

              {/* CREDITED/DEBITED INVOICE Section - ZIMRA Spec [24-28] */}
              {(isCreditNote || isDebitNote) && invoice.relatedInvoiceId && (
                <div className="mt-6 pt-6 border-t border-slate-300">
                  <h4 className="font-bold text-slate-700 uppercase text-sm mb-3">
                    {isCreditNote ? "Credited Invoice" : "Debited Invoice"}
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2 gap-x-12">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Invoice No:</span>
                      <span className="font-bold text-emerald-700">{(invoice as any).relatedInvoiceNumber || `#${invoice.relatedInvoiceId}`}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Date:</span>
                      <span className="font-bold text-slate-900">{(invoice as any).relatedInvoiceDate ? new Date((invoice as any).relatedInvoiceDate).toLocaleString('en-GB') : "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Customer Reference No:</span>
                      <span className="font-bold text-slate-900">{(invoice as any).relatedInvoiceNumber || `#${invoice.relatedInvoiceId}`}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-500">Device Serial No:</span>
                      <span className="font-bold text-slate-900">{company?.fdmsDeviceSerialNo || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Line Items */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-slate-900 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 font-bold text-slate-900 w-16">HS Code</th>
                  <th className="text-left py-3 font-bold text-slate-900">Description</th>
                  <th className="text-center py-3 font-bold text-slate-900 w-16">Qty</th>
                  <th className="text-right py-3 font-bold text-slate-900 w-24">Price {invoice.taxInclusive ? '(Incl)' : '(Excl)'}</th>
                  <th className="text-center py-3 font-bold text-slate-900 w-20">Tax %</th>
                  <th className="text-right py-3 font-bold text-slate-900 w-24">VAT</th>
                  <th className="text-right py-3 font-bold text-slate-900 w-32">Amount (Incl)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map((item: any, i: number) => {
                  const lineTotal = Number(item.quantity) * Number(item.unitPrice);
                  const taxRate = Number(item.taxRate ?? 15);

                  // Calc inclusive/exclusive
                  let displayPrice = Number(item.unitPrice);
                  let displayTotal = Number(item.lineTotal);
                  let vatAmt = 0;

                  if (invoice.taxInclusive) {
                    // Price is inclusive
                    vatAmt = displayTotal - (displayTotal / (1 + taxRate / 100));
                  } else {
                    // Price is exclusive
                    vatAmt = displayTotal * (taxRate / 100);
                    // Display total on line usually inclusive for final column? Layout says "Total amount (incl. tax)" for [33.1]
                    displayTotal += vatAmt;
                  }

                  return (
                    <tr key={i}>
                      <td className="py-3 text-slate-500 text-xs font-mono">{item.product?.hsCode || "0000"}</td>
                      <td className="py-3 text-slate-700">{item.description}</td>
                      <td className="py-3 text-center text-slate-700">{item.quantity}</td>
                      <td className="py-3 text-right text-slate-700">{displayPrice.toFixed(2)}</td>
                      <td className="py-3 text-center text-slate-700 font-mono font-medium">{taxRate}%</td>
                      <td className="py-3 text-right text-slate-500 text-xs">{vatAmt.toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{displayTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="flex flex-col sm:flex-row gap-8 mb-8">
              <div className="flex-1">
                <div className="space-y-1 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase tracking-widest font-bold">Total Items [39]:</span>
                    <span className="font-bold text-slate-700">{invoice.items?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase tracking-widest font-bold">Currency [34]:</span>
                    <span className="font-bold text-slate-700">{invoice.currency || "USD"}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400 uppercase tracking-widest font-bold">Payment Method [37]:</span>
                    <span className="font-bold text-slate-700">{invoice.paymentMethod || "CASH"}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1" /> {/* Spacer */}
            </div>

            {/* 5. Totals & Tax Analysis */}
            <div className="flex flex-col sm:flex-row gap-8 justify-end border-t-2 border-slate-900 pt-6">

              {/* Tax Analysis (Left) */}
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase mb-2 text-slate-500">Tax Analysis</h4>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400">
                      <th className="text-left py-1">Type</th>
                      <th className="text-right py-1">Rate</th>
                      <th className="text-right py-1">VAT Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Simplified Tax Row for Demo - In real app, aggregate items by tax rate */}
                    {/* We assume standard 15% for all for now, or fetch from summary */}
                    {(() => {
                      const rates = Array.from(new Set(invoice.items?.map((i: any) => Number(i.taxRate ?? 15))));
                      const isMixed = rates.length > 1;
                      const displayRate = isMixed ? "Mixed" : `${rates[0]}%`;
                      return (
                        <tr>
                          <td className="py-1 text-slate-600">VAT {isMixed ? 'Mixed' : 'Standard'}</td>
                          <td className="py-1 text-right text-slate-600 font-mono">{displayRate}</td>
                          <td className="py-1 text-right text-slate-600 font-bold font-mono">{Number(invoice.taxAmount).toFixed(2)}</td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Tax Summary Section - ZIMRA Fields [40-44] */}
              {Object.keys(taxSummary).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase mb-3">Tax Summary</h3>
                  <div className="space-y-2">
                    {Object.entries(taxSummary).map(([rate, data]) => {
                      const summary = data as { taxRate: number; netAmount: number; taxAmount: number; totalAmount: number };
                      return (
                        <div key={rate} className="grid grid-cols-4 gap-4 text-sm border-b border-slate-200 pb-2 last:border-0">
                          <div className="font-medium text-slate-600">
                            {summary.taxRate === 0 ? 'Exempt' : `VAT ${summary.taxRate}%`}
                          </div>
                          <div className="text-right text-slate-600">
                            Net: {invoice.currency} {summary.netAmount.toFixed(2)}
                          </div>
                          <div className="text-right text-slate-600">
                            VAT: {invoice.currency} {summary.taxAmount.toFixed(2)}
                          </div>
                          <div className="text-right font-bold text-slate-900">
                            Total: {invoice.currency} {summary.totalAmount.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Number of Items - ZIMRA Field [39] */}
              <div className="flex justify-between text-sm text-slate-600 px-2 mb-4">
                <span>Number of Items:</span>
                <span className="font-bold">{numberOfItems}</span>
              </div>

              {/* Totals (Right) */}
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total (Excl. Tax)</span>
                  <span className="font-bold text-slate-900">{Number(invoice.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total VAT</span>
                  <span className="font-bold text-slate-900">{Number(invoice.taxAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                  <span className="text-lg font-bold text-slate-900">Total Paid</span>
                  <span className="text-lg font-bold text-slate-900">{invoice.currency} {Number(invoice.total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-600 pt-1">
                  <span>Payment Method:</span>
                  <span className="font-medium uppercase">{invoice.paymentMethod || 'CASH'}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-emerald-600 pt-1">
                      <span className="">Amount Paid</span>
                      <span className="font-bold">{invoice.currency} {totalPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-300 pt-1 mt-1">
                      <span className="font-bold text-slate-700">Balance Due</span>
                      <span className="font-bold text-slate-900">{invoice.currency} {balanceDue.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>


            {/* Banking Details */}
            {(company?.bankName || company?.accountNumber) && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase mb-4 text-slate-500">Banking Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Bank</p>
                    <p className="font-bold text-slate-700">{company.bankName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Account Name</p>
                    <p className="font-bold text-slate-700">{company.accountName || company.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Account Number</p>
                    <p className="font-bold text-slate-700 font-mono">{company.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs mb-1">Branch Code</p>
                    <p className="font-bold text-slate-700">{company.branchCode || "N/A"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payments History */}
            {payments && payments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase mb-4 text-slate-500">Payment History</h4>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Method</th>
                      <th className="pb-2">Reference</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any) => (
                      <tr key={payment.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 text-slate-700">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                        <td className="py-2 text-slate-700 capitalize">{payment.paymentMethod.replace('_', ' ').toLowerCase()}</td>
                        <td className="py-2 text-slate-500 font-mono text-xs">{payment.reference || '-'}</td>
                        <td className="py-2 text-right font-medium text-slate-900">{Number(payment.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. Footer: QR & Label */}
            <div className="mt-12 flex items-center justify-between gap-8 border-t border-slate-100 pt-8">
              <div className="flex-1">
                <p className="font-bold text-slate-900 mb-1">
                  {invoice.status === 'quote'
                    ? "OFFICIAL QUOTATION"
                    : (invoice.fiscalCode
                      ? (isCreditNote ? "FISCAL CREDIT NOTE" : (isDebitNote ? "FISCAL DEBIT NOTE" : "FISCAL TAX INVOICE"))
                      : (invoice.status === 'draft'
                        ? (isCreditNote ? "DRAFT CREDIT NOTE" : (isDebitNote ? "DRAFT DEBIT NOTE" : "DRAFT INVOICE"))
                        : (isCreditNote ? "PROFORMA CREDIT NOTE" : (isDebitNote ? "PROFORMA DEBIT NOTE" : "PROFORMA INVOICE"))))}
                </p>
                <p className="text-xs text-slate-400">
                  {invoice.status === 'quote'
                    ? "Valid for 30 days unless otherwise stated."
                    : (invoice.fiscalCode
                      ? `Issued via ZIMRA Fiscal Device`
                      : "This document is not valid for tax purposes until fiscalized.")}
                </p>
              </div>
              {invoice.qrCodeData && (
                <div className="border p-2 bg-white rounded">
                  <QRCodeSVG value={invoice.qrCodeData} size={100} />
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      </div>

      <PaymentModal
        invoice={invoice}
        remainingBalance={balanceDue}
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
      />

      <EmailInvoiceDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        defaultEmail={invoice.customer?.email || undefined}
        onSend={handleSendEmail}
        isSending={isSendingEmail}
      />
    </Layout >
  );
}
