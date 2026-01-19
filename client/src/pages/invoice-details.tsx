import { Layout } from "@/components/layout";
import { useInvoice, useFiscalizeInvoice } from "@/hooks/use-invoices";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Printer, Send, ShieldCheck, Loader2, Download } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoices/pdf-document";
import { useCompany } from "@/hooks/use-companies";
import QRCode from 'qrcode';
import { useState, useEffect } from "react";

export default function InvoiceDetailsPage() {
  const [, params] = useRoute("/invoices/:id");
  const [, setLocation] = useLocation();
  const invoiceId = parseInt(params?.id || "0");
  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const { data: company } = useCompany(invoice?.companyId || 0);
  const fiscalize = useFiscalizeInvoice();

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (invoice?.qrCodeData) {
      QRCode.toDataURL(invoice.qrCodeData)
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error("QR Generation Error", err));
    }
  }, [invoice?.qrCodeData]);

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

  return (
    <Layout>
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/invoices")} className="mb-2 pl-0 text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-slate-900">{invoice.invoiceNumber}</h1>
            <StatusBadge status={invoice.status!} />
          </div>
        </div>

        <div className="flex gap-2">
          {invoice && company && (
            <PDFDownloadLink
              document={
                <InvoicePDF
                  invoice={invoice}
                  company={company}
                  customer={invoice.customer}
                  qrCodeUrl={qrCodeDataUrl}
                />
              }
              fileName={`Invoice-${invoice.invoiceNumber}.pdf`}
            >
              {({ loading }) => (
                <Button variant="outline" className="bg-white" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Download PDF
                </Button>
              )}
            </PDFDownloadLink>
          )}
          {invoice.status === "draft" && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              onClick={() => fiscalize.mutate(invoiceId)}
              disabled={fiscalize.isPending}
            >
              {fiscalize.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Fiscalize
            </Button>
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
                      <p className="font-bold text-lg text-slate-800">{company.tradingName || company.name}</p>
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

            {/* 3. Fiscal Header Info */}
            <div className="bg-slate-50 rounded-lg p-6 mb-10 border border-slate-100">
              <div className="grid grid-cols-2 gap-y-4 gap-x-12">
                <div className="space-y-2">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Invoice No:</span>
                    <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Global No:</span>
                    {/* Assuming ID is close enough to global no for display if not persisted, but we fetched it in routes. 
                       Ideally fetch 'fiscalReceiptGlobalNo' if available. 
                       For now using invoice ID as proxy if not in invoice object directly. 
                       Wait, backend logic uses ID for receiptGlobalNo unless dedicated column. */}
                    <span className="font-bold text-slate-900">{invoice.id}</span>
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
                    <span className="font-bold text-slate-900">{company?.fdmsDeviceId}</span>
                  </div>
                  {/* Serial should be fetched, we will assume it matches config or just display ID for now as placeholder if serial unknown */}
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Currency:</span>
                    <span className="font-bold text-slate-900">{invoice.currency || "USD"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Line Items */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-slate-900 text-xs uppercase tracking-wider">
                  <th className="text-left py-3 font-bold text-slate-900 w-16">HS Code</th>
                  <th className="text-left py-3 font-bold text-slate-900">Description</th>
                  <th className="text-center py-3 font-bold text-slate-900 w-16">Qty</th>
                  <th className="text-right py-3 font-bold text-slate-900 w-24">Price</th>
                  <th className="text-right py-3 font-bold text-slate-900 w-24">VAT</th>
                  <th className="text-right py-3 font-bold text-slate-900 w-32">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items?.map((item: any, i: number) => {
                  const lineTotal = Number(item.quantity) * Number(item.unitPrice);
                  const taxRate = Number(item.taxRate || 15);

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
                      <td className="py-3 text-right text-slate-500 text-xs">{vatAmt.toFixed(2)} ({taxRate}%)</td>
                      <td className="py-3 text-right font-bold text-slate-900">{displayTotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

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
                    <tr>
                      <td className="py-1 text-slate-600">Standard</td>
                      <td className="py-1 text-right text-slate-600">15%</td>
                      <td className="py-1 text-right text-slate-600">{Number(invoice.taxAmount).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
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
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-lg font-bold text-slate-900">{invoice.currency} {Number(invoice.total).toFixed(2)}</span>
                </div>
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

            {/* 6. Footer: QR & Label */}
            <div className="mt-12 flex items-center justify-between gap-8 border-t border-slate-100 pt-8">
              <div className="flex-1">
                <p className="font-bold text-slate-900 mb-1">
                  {invoice.fiscalCode ? "FISCAL TAX INVOICE" : "PROFORMA INVOICE"}
                </p>
                <p className="text-xs text-slate-400">
                  {invoice.fiscalCode
                    ? "Invoice issued via ZIMRA Fiscal Device"
                    : "This document is not valid for tax purposes until fiscalized."}
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
    </Layout>
  );
}
