import { Layout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { useInvoice, useFiscalizeInvoice, useUpdateInvoice, useCreateCreditNote, useCreateDebitNote, usePayments, useConvertQuotation } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Printer, Send, ShieldCheck, Loader2, Download, Undo2, ClipboardList, MessageCircle, MoreVertical, Mail, Share2, CreditCard } from "lucide-react";
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
import { useTaxConfig } from "@/hooks/use-tax-config";

import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ValidationErrorsDisplay } from "@/components/invoices/validation-errors-display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function InvoiceDetailsPage() {
  const [, params] = useRoute("/invoices/:id");
  const [, setLocation] = useLocation();
  const invoiceId = parseInt(params?.id || "0");
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: company } = useCompany(invoice?.companyId || 0);
  const { taxTypes } = useTaxConfig(invoice?.companyId || 0);
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

  // Double-click prevention states
  const [isFiscalizing, setIsFiscalizing] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [isCreatingCN, setIsCreatingCN] = useState(false);
  const [isCreatingDN, setIsCreatingDN] = useState(false);

  const totalPaid = payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  // Use a small epsilon for float comparison safety or just rely on fixed point logic in backend
  const balanceDue = Math.max(0, Number(invoice?.total || 0) - totalPaid);
  const isPaid = balanceDue <= 0.01; // Tolerance for float math

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    // Only generate QR if invoice is Fiscalized (has fiscalCode)
    if (invoice?.fiscalCode) {
      // Use specific QR Data if available, else Company URL
      const dataToEncode = invoice?.qrCodeData || company?.qrUrl;
      if (dataToEncode) {
        QRCode.toDataURL(dataToEncode)
          .then(url => setQrCodeDataUrl(url))
          .catch(err => console.error("QR Generation Error", err));
      }
    } else {
      setQrCodeDataUrl("");
    }
  }, [invoice?.fiscalCode, invoice?.qrCodeData, company?.qrUrl]);

  const handleIssue = async () => {
    if (isIssuing) return;
    try {
      setIsIssuing(true);
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
    } finally {
      setIsIssuing(false);
    }
  };

  const handleCreateCreditNote = async () => {
    if (!invoice || isCreatingCN) return;
    try {
      setIsCreatingCN(true);
      const newCN = await createCreditNote.mutateAsync(invoiceId);
      setLocation(`/invoices/new?edit=${newCN.id}`);
    } catch (error) {
      console.error("Failed to create credit note", error);
    } finally {
      setIsCreatingCN(false);
    }
  }

  const handleCreateDebitNote = async () => {
    if (!invoice || isCreatingDN) return;
    try {
      setIsCreatingDN(true);
      const newDN = await createDebitNote.mutateAsync(invoiceId);
      setLocation(`/invoices/new?edit=${newDN.id}`);
    } catch (error) {
      console.error("Failed to create debit note", error);
    } finally {
      setIsCreatingDN(false);
    }
  }

  const handleShareWhatsapp = async () => {
    if (!invoice || !company) return;

    // Prepare Text
    const customerPhone = invoice.customer?.phone || "";
    let phoneParam = "";
    if (customerPhone) {
      const digits = customerPhone.replace(/\D/g, '');
      phoneParam = digits;
    }
    const text = `Hello ${invoice.customer?.name || "Customer"},\n\nHere is your *${invoice.status === 'quote' ? "Quotation" : "Invoice"} ${invoice.invoiceNumber}* from *${company.tradingName || company.name}*.\n\nTotal: *${invoice.currency} ${Number(invoice.total).toFixed(2)}*.\n\nPlease find the document attached or contact us for payment.`;

    try {
      // Attempt Native Share with File (Mobile/Supported Browsers)
      const doc = (
        <InvoicePDF
          invoice={invoice}
          company={company}
          customer={invoice.customer}
          qrCodeUrl={qrCodeDataUrl}
        />
      );
      const blob = await pdf(doc).toBlob();
      const file = new File([blob], `${invoice.invoiceNumber}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${invoice.invoiceNumber}`,
          text: text
        });
        return; // Success
      }
    } catch (e) {
      console.warn("Native share not supported or failed, falling back to link", e);
    }

    // Fallback: Default WhatsApp Link (Text Only)
    // Use encodeURIComponent for the text
    const url = `https://wa.me/${phoneParam}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

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

  if (isLoading || taxTypes.isLoading) {
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

    const taxTypeId = item.taxTypeId || 0;
    const key = `${taxRate}-${taxTypeId}`;

    if (!acc[key]) {
      acc[key] = { taxRate, taxTypeId, netAmount: 0, taxAmount: 0, totalAmount: 0 };
    }

    acc[key].netAmount += netAmount;
    acc[key].taxAmount += taxAmount;
    acc[key].totalAmount += netAmount + taxAmount;

    return acc;
  }, {} as Record<string, { taxRate: number; taxTypeId: number; netAmount: number; taxAmount: number; totalAmount: number }>);

  // Calculate Number of Items (ZIMRA Field [39])
  const numberOfItems = invoice.items.reduce((sum, item) => sum + Number(item.quantity), 0);

  return (
    <Layout>
      <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Button
            variant="ghost"
            onClick={() => setLocation(invoice?.status === 'quote' ? "/quotations" : "/invoices")}
            className="mb-1 pl-0 text-slate-500 hover:text-slate-900 h-auto py-1"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to {invoice?.status === 'quote' ? "Quotations" : "Invoices"}
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-slate-900">
              {invoice.status === 'quote' ? "Quotation" : (isCreditNote ? "Credit Note" : "Invoice")} {invoice.invoiceNumber}
            </h1>
            <StatusBadge status={
              (invoice.fdmsStatus === 'failed' || invoice.validationStatus === 'red') ? 'failed' : invoice.status!
            }>
              {(invoice.fdmsStatus === 'failed' || invoice.validationStatus === 'red') ? "Fiscalised with Errors" : undefined}
            </StatusBadge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PRIMARY ACTIONS: Fiscalize & Pay */}

          {/* Fiscalize - Top Priority for Issued/Paid */}
          {["issued", "paid"].includes(invoice.status || "") && !invoice.fiscalCode && (
            <Button
              size="sm"
              className={cn(
                "shadow-sm text-white",
                (invoice.fdmsStatus === 'failed' || invoice.validationStatus === 'red')
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              )}
              onClick={() => {
                if (isFiscalizing) return;
                setIsFiscalizing(true);
                fiscalize.mutate(invoiceId, {
                  onSettled: () => setIsFiscalizing(false)
                });
              }}
              disabled={fiscalize.isPending || isFiscalizing}
            >
              {fiscalize.isPending || isFiscalizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              {(invoice.fdmsStatus === 'failed' || invoice.validationStatus === 'red') ? "Result" : "Fiscalize"}
            </Button>
          )}

          {/* Record Payment - Primary for Issued/Fiscalized */}
          {!isPaid && ["issued", "fiscalized"].includes(invoice.status || "") && (
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
              onClick={() => setShowPaymentModal(true)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pay
            </Button>
          )}

          {/* Issue - Primary for Draft */}
          {invoice.status === "draft" && (
            <Button
              className="bg-primary hover:bg-primary/90"
              size="sm"
              onClick={handleIssue}
              disabled={updateInvoice.isPending || isIssuing}
            >
              {updateInvoice.isPending || isIssuing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Issue
            </Button>
          )}

          {/* Convert - Primary for Quote */}
          {invoice.status === "quote" && (
            <Button
              className="bg-primary hover:bg-primary/90 hidden sm:flex"
              size="sm"
              onClick={() => convertQuotation.mutate(invoiceId)}
              disabled={convertQuotation.isPending}
            >
              {convertQuotation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
              Convert to Invoice
            </Button>
          )}

          {/* SECONDARY ACTIONS GROUPED */}

          {/* Share Menu */}
          {["issued", "paid", "fiscalized"].includes(invoice.status || "") && invoice && company && (!invoice.fiscalCode || qrCodeDataUrl) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Share2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Share Invoice</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleShareWhatsapp}>
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowEmailDialog(true)}>
                  <Mail className="w-4 h-4 mr-2" /> Email
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Download Button (Icon only on mobile, text on desktop if space) */}
          {["issued", "paid", "fiscalized"].includes(invoice.status || "") && invoice && company && (!invoice.fiscalCode || qrCodeDataUrl) && (
            <PDFDownloadLink
              document={
                <InvoicePDF
                  invoice={invoice}
                  company={company}
                  customer={invoice.customer}
                  qrCodeUrl={qrCodeDataUrl}
                  taxTypes={taxTypes.data}
                />
              }
              fileName={`${isCreditNote ? "CreditNote" : "Invoice"}-${invoice.invoiceNumber}.pdf`}
            >
              {({ loading }) => (
                <Button variant="outline" size="icon" className="h-9 w-9" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </Button>
              )}
            </PDFDownloadLink>
          )}

          {/* More Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Edit based on status */}
              {invoice.status === "draft" && (
                <DropdownMenuItem onClick={() => setLocation(`/invoices/new?edit=${invoiceId}`)}>
                  Edit Draft
                </DropdownMenuItem>
              )}
              {invoice.status === "quote" && (
                <>
                  <DropdownMenuItem onClick={() => setLocation(`/quotations/new?edit=${invoiceId}`)}>
                    Edit Quotation
                  </DropdownMenuItem>
                  <DropdownMenuItem className="sm:hidden" onClick={() => convertQuotation.mutate(invoiceId)}>
                    Convert to Invoice
                  </DropdownMenuItem>
                </>
              )}

              {/* Credit/Debit Notes - Allowed on ALL issued/fiscalized types including other CN/DNs */}
              {["issued", "paid", "fiscalized"].includes(invoice.status || "") && (
                <>
                  <DropdownMenuItem
                    onClick={handleCreateCreditNote}
                    disabled={createCreditNote.isPending || isCreatingCN || createDebitNote.isPending || isCreatingDN}
                  >
                    <Undo2 className="w-4 h-4 mr-2" /> Issue Credit Note
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleCreateDebitNote}
                    disabled={createDebitNote.isPending || isCreatingDN || createCreditNote.isPending || isCreatingCN}
                  >
                    <Send className="w-4 h-4 mr-2" /> Issue Debit Note
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Print View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Validation Errors Display */}
      {(invoice as any)?.validationErrors && (invoice as any).validationErrors.length > 0 && (
        <div className="max-w-4xl mx-auto mb-6">
          <ValidationErrorsDisplay
            errors={(invoice as any).validationErrors}
          />
        </div>
      )}

      {/* Validation Status Banner */}
      {invoice?.validationStatus && invoice.validationStatus !== 'valid' && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className={cn(
            "border rounded-lg p-4",
            invoice.validationStatus === 'red' ? "bg-red-50 border-red-200" :
              invoice.validationStatus === 'grey' ? "bg-slate-50 border-slate-200" :
                "bg-yellow-50 border-yellow-200"
          )}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldCheck className={cn(
                  "h-5 w-5",
                  invoice.validationStatus === 'red' ? "text-red-400" :
                    invoice.validationStatus === 'grey' ? "text-slate-400" :
                      "text-yellow-400"
                )} />
              </div>
              <div className="ml-3">
                <h3 className={cn(
                  "text-sm font-medium",
                  invoice.validationStatus === 'red' ? "text-red-800" :
                    invoice.validationStatus === 'grey' ? "text-slate-800" :
                      "text-yellow-800"
                )}>
                  ZIMRA Validation: {invoice.validationStatus.toUpperCase()}
                </h3>
                <div className={cn(
                  "mt-2 text-sm",
                  invoice.validationStatus === 'red' ? "text-red-700" :
                    invoice.validationStatus === 'grey' ? "text-slate-700" :
                      "text-yellow-700"
                )}>
                  {invoice.validationStatus === 'red' && <p>This receipt has major validation errors. You will not be able to close the fiscal day until this is resolved.</p>}
                  {invoice.validationStatus === 'grey' && <p>This receipt is missing a previous receipt in the chain. You will not be able to close the fiscal day until this is resolved.</p>}
                  {invoice.validationStatus === 'yellow' && <p>This receipt has minor validation issues. You can still close the fiscal day, but it's recommended to review the errors.</p>}
                  {invoice.validationStatus === 'invalid' && <p>This receipt has validation issues that need review.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <Card className="border-none shadow-xl bg-white overflow-hidden print:shadow-none print:border">
          <CardContent className="p-6 font-mono text-sm">

            {/* 1. Verification Block */}
            {invoice.fiscalCode && (
              <div className="text-center border-b border-slate-100 pb-4 mb-6 bg-slate-50/50 -mx-6 -mt-6 pt-6 px-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Verification Code</p>
                <p className="font-bold text-base tracking-wider font-mono text-emerald-600 mb-1">{verificationCode}</p>
                <p className="text-[10px] text-slate-500">
                  Verify at <a href={company?.qrUrl || "https://receipt.zimra.org"} target="_blank" className="underline hover:text-emerald-600">{company?.qrUrl || "https://receipt.zimra.org"}</a>
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
                      <div className="pt-4 space-y-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">TIN</p>
                          <p className="font-bold text-slate-800">{company.tin}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">VAT No</p>
                          <p className="font-bold text-slate-800">{company.vatNumber || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Email</p>
                          <p className="font-bold text-slate-800">{company.email}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Phone</p>
                          <p className="font-bold text-slate-800">{company.phone}</p>
                        </div>
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
                      <div className="pt-4 space-y-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">TIN</p>
                          <p className="font-bold text-slate-800">{invoice.customer.tin || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">VAT No</p>
                          <p className="font-bold text-slate-800">{invoice.customer.vatNumber || "N/A"}</p>
                        </div>
                        {invoice.customer.email && (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Email</p>
                            <p className="font-bold text-slate-800">{invoice.customer.email}</p>
                          </div>
                        )}
                        {invoice.customer.phone && (
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Phone</p>
                            <p className="font-bold text-slate-800">{invoice.customer.phone}</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : <p className="italic text-slate-400">Walk-in Customer</p>}
                </div>
              </div>
            </div>

            {/* 3. Header Info */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100">
              <div className="grid grid-cols-2 gap-y-6 gap-x-12">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">
                      {isCreditNote ? "Credit Note No" : (isDebitNote ? "Debit Note No" : "Invoice No")}
                    </p>
                    <p className="font-bold text-slate-900 text-lg">
                      {invoice.receiptCounter !== null && invoice.receiptCounter !== undefined &&
                        invoice.receiptGlobalNo !== null && invoice.receiptGlobalNo !== undefined
                        ? `${invoice.receiptCounter}/${invoice.receiptGlobalNo}`
                        : invoice.invoiceNumber}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Customer Reference No</p>
                    <p className="font-bold text-slate-900">{invoice.invoiceNumber}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Fiscal Day No</p>
                    <p className="font-bold text-slate-900">{invoice.fiscalDayNo || "N/A"}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Date</p>
                    <p className="font-bold text-slate-900">{new Date(invoice.issueDate || new Date()).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Device ID</p>
                    <p className="font-bold text-slate-900">{company?.fdmsDeviceId || "N/A"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Device Serial No</p>
                    <p className="font-bold text-slate-900">{company?.fdmsDeviceSerialNo || "N/A"}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-500 text-xs uppercase tracking-wide">Currency</p>
                    <p className="font-bold text-slate-900">{invoice.currency || "USD"}</p>
                  </div>
                </div>
              </div>

              {/* CREDITED/DEBITED INVOICE Section - ZIMRA Spec [24-28] */}
              {(isCreditNote || isDebitNote) && invoice.relatedInvoiceId && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase">
                      {isCreditNote ? "Credited Invoice" : "Debited Invoice"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Inv No:</span>
                      <span className="font-bold text-slate-800">
                        {(invoice as any).relatedReceiptGlobalNo !== undefined ? (invoice as any).relatedReceiptGlobalNo : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Date:</span>
                      <span className="font-bold text-slate-800">
                        {(invoice as any).relatedInvoiceDate
                          ? new Date((invoice as any).relatedInvoiceDate).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                          : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Ref:</span>
                      <span className="font-bold text-slate-800">{(invoice as any).relatedInvoiceNumber || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">ID:</span>
                      <span className="font-bold text-slate-800">{company?.fdmsDeviceId || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Serial:</span>
                      <span className="font-bold text-slate-800">{company?.fdmsDeviceSerialNo || "N/A"}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Line Items */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b border-slate-900 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 font-bold text-slate-900 w-16">HS Code</th>
                  <th className="text-left py-3 font-bold text-slate-900">Description</th>
                  <th className="text-center py-3 font-bold text-slate-900 w-16">Qty</th>
                  <th className="text-right py-3 font-bold text-slate-900 w-24">Price {invoice.taxInclusive ? '(Incl)' : '(Excl)'}</th>
                  <th className="text-right py-3 font-bold text-slate-900 w-24">
                    {invoice.taxInclusive ? 'VAT' : 'Amount (excl. tax)'}
                  </th>
                  <th className="text-right py-3 font-bold text-slate-900 w-32">Total Amount (incl. tax)</th>
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
                      {!invoice.taxInclusive && <td className="py-3 text-right text-slate-700">{lineTotal.toFixed(2)}</td>}
                      <td className="py-3 text-right text-slate-500 text-xs">{(() => {
                        const matchingType = taxTypes.data?.find((t: any) => t.id == item.taxTypeId);
                        const zimraTaxIdRaw = matchingType?.zimraTaxId;
                        const isExempt = zimraTaxIdRaw == "1" || zimraTaxIdRaw == 1 || matchingType?.zimraCode === 'C' || matchingType?.zimraCode === 'E' || matchingType?.name?.toLowerCase().includes('exempt');
                        const isZeroRated = zimraTaxIdRaw == "2" || zimraTaxIdRaw == 2 || matchingType?.zimraCode === 'D' || matchingType?.name?.toLowerCase().includes('zero rated') || (!isExempt && taxRate === 0);
                        return isExempt ? "-" : vatAmt.toFixed(2);
                      })()}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{displayTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>


            {/* 5. Totals & Tax Summary */}
            <div className="flex flex-col sm:flex-row gap-8 justify-end border-t-2 border-slate-900 pt-6">

              {/* Tax Summary Section - ZIMRA Fields [40-44] */}
              {Object.keys(taxSummary).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase mb-3 text-center">Tax Analysis</h3>
                  <div className="grid grid-cols-4 gap-4 text-[10px] font-bold text-slate-500 uppercase mb-2 border-b border-slate-200 pb-1">
                    <div className="text-left font-bold text-slate-500 uppercase">VAT %</div>
                    <div className="text-right">Net.Amt</div>
                    <div className="text-right">VAT</div>
                    <div className="text-right">Amount</div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(taxSummary).map(([key, data]) => {
                      const summary = data as { taxRate: number; taxTypeId: number; netAmount: number; taxAmount: number; totalAmount: number };
                      const matchingType = taxTypes.data?.find((t: any) => t.id == summary.taxTypeId);
                      const zimraTaxIdRaw = matchingType?.zimraTaxId;
                      const isExempt = zimraTaxIdRaw == "1" || zimraTaxIdRaw == 1 || matchingType?.zimraCode === 'C' || matchingType?.zimraCode === 'E' || matchingType?.name?.toLowerCase().includes('exempt');
                      const isZeroRated = zimraTaxIdRaw == "2" || zimraTaxIdRaw == 2 || matchingType?.zimraCode === 'D' || matchingType?.name?.toLowerCase().includes('zero rated') || (!isExempt && summary.taxRate === 0);

                      return (
                        <div key={key} className="grid grid-cols-4 gap-4 text-sm border-b border-slate-200 pb-2 last:border-0">
                          <div className="font-medium text-slate-600">
                            {isExempt ? (matchingType?.name || "Exempt") : `${Number(summary.taxRate).toFixed(2)}%`}
                          </div>
                          <div className="text-right text-slate-600 font-mono">
                            {summary.netAmount.toFixed(2)}
                          </div>
                          <div className="text-right text-slate-600 font-mono">
                            {isExempt ? "-" : summary.taxAmount.toFixed(2)}
                          </div>
                          <div className="text-right font-bold text-slate-900 font-mono">
                            {summary.totalAmount.toFixed(2)}
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
                  <span className="text-slate-500">{invoice.taxInclusive ? "Subtotal" : "Total (excl. tax)"}</span>
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
                <p className="font-extrabold text-slate-900 text-xl uppercase mb-1">
                  {invoice.status === 'quote'
                    ? "OFFICIAL QUOTATION"
                    : (isCreditNote
                      ? "CREDIT NOTE"
                      : (isDebitNote
                        ? "DEBIT NOTE"
                        : (invoice.fiscalCode
                          ? (company?.vatRegistered ? "FISCAL TAX INVOICE" : "FISCAL INVOICE")
                          : (invoice.status === 'draft' ? "DRAFT INVOICE" : "PROFORMA INVOICE"))))}
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
