import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useCompany } from "@/hooks/use-companies";
import { useInvoice } from "@/hooks/use-invoices";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { PaymentReceiptPDF } from "@/components/invoices/payment-receipt-pdf";
import { pdf } from "@react-pdf/renderer";
import { useState, useEffect } from "react";
import { Loader2, ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/layout";

export default function PaymentPreviewPage() {
  const [, params] = useRoute("/payments/:id/preview");
  const [, setLocation] = useLocation();
  const paymentId = parseInt(params?.id || "0");

  // Fetch payment details - we'll use the report endpoint or a specific one if available
  // For now, we'll try to get it from the payments report for the specific ID
  const { data: payments, isLoading: isLoadingPayments } = useQuery<any[]>({
    queryKey: [api.reports.payments.path],
    enabled: !!paymentId,
  });

  const payment = payments?.find(p => p.id === paymentId);
  const { data: invoice, isLoading: isLoadingInvoice } = useInvoice(payment?.invoiceId || 0);
  const { data: company } = useCompany(payment?.companyId || 0);
  const { taxTypes } = useTaxConfig(payment?.companyId || 0);

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    if (!payment || !company || isLoadingInvoice) return;

    let revoked = false;
    setPdfGenerating(true);

    const generatePdf = async () => {
      try {
        const blob = await pdf(
          <PaymentReceiptPDF
            payment={{
              ...payment,
              paymentDate: payment.paymentDate || new Date(),
            }}
            company={company}
            invoice={invoice}
            taxTypes={taxTypes?.data || []}
          />
        ).toBlob();

        if (!revoked) {
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        }
      } catch (error) {
        console.error("Failed to generate PDF:", error);
      } finally {
        if (!revoked) setPdfGenerating(false);
      }
    };

    generatePdf();

    return () => {
      revoked = true;
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [payment, company, invoice, taxTypes, isLoadingInvoice]);

  const isLoading = isLoadingPayments || isLoadingInvoice || !company;

  return (
    <Layout>
      <div className="flex flex-col h-full bg-slate-50 -mx-4 sm:-mx-8 -mt-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/payments-received")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h1 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
              Payment Receipt Preview
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            {pdfBlobUrl && (
              <Button asChild size="sm" className="btn-gradient">
                <a href={pdfBlobUrl} download={`Receipt-${payment?.invoiceNumber || paymentId}.pdf`}>
                  <Download className="w-4 h-4 mr-2" /> Download
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center">
          <div className="w-full max-w-[850px] bg-white shadow-2xl rounded-xl overflow-hidden min-h-[1100px]">
            {isLoading || pdfGenerating ? (
              <div className="flex flex-col items-center justify-center h-[600px] text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="font-medium">Preparing A4 Preview...</p>
              </div>
            ) : pdfBlobUrl ? (
              <iframe
                src={pdfBlobUrl}
                title="Payment Receipt Preview"
                width="100%"
                height="1200px"
                className="border-none"
              />
            ) : (
              <div className="flex items-center justify-center h-[600px] text-red-400">
                Failed to load preview data.
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
