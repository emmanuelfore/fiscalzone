import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useActiveCompany } from "@/hooks/use-active-company";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, Download, FileText, Search, User as UserIcon, Calendar as CalendarIcon, Printer, ArrowLeft } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { CustomerStatementPDF } from "@/components/reports/customer-statement-pdf";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { useCustomers } from "@/hooks/use-customers";

export default function CustomerStatements() {
  const { activeCompany: company, activeCompanyId } = useActiveCompany();
  const [location, setLocation] = useLocation();
  const queryParams = new URLSearchParams(location.split("?")[1]);
  const initialCustomerId = queryParams.get("customerId");

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || "");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [currency, setCurrency] = useState<string>("USD");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: customers, isLoading: isLoadingCustomers } = useCustomers(activeCompanyId);

  const { data: statementData, isLoading: isLoadingStatement } = useQuery<any>({
    queryKey: ["/api/customers", selectedCustomerId, "statement", startDate.toISOString(), endDate.toISOString(), currency],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/customers/${selectedCustomerId}/statement?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&currency=${currency}`
      );
      if (!res.ok) throw new Error("Failed to fetch statement");
      return res.json();
    },
    enabled: !!selectedCustomerId && !!company,
  });

  useEffect(() => {
    if (statementData && company) {
      generatePdf();
    }
  }, [statementData, company, startDate, endDate, currency]);

  const generatePdf = async () => {
    if (!statementData || !company) return;
    setIsGenerating(true);
    try {
      const doc = (
        <CustomerStatementPDF
          data={statementData}
          company={company}
          startDate={startDate}
          endDate={endDate}
          currency={currency}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(url);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col -mx-4 sm:-mx-8 -mt-6 bg-slate-50/50 min-h-screen">
        <div className="p-4 border-b bg-white flex justify-between items-center shrink-0 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setLocation("/reports")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Customer Statements</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-none">Official Statement of Account</p>
            </div>
          </div>
          <div className="flex gap-3">
             <Button 
              variant="outline" 
              className="rounded-xl border-slate-200 h-9"
              onClick={() => window.print()}
              disabled={!pdfBlobUrl}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            {pdfBlobUrl && (
              <a href={pdfBlobUrl} download={`Statement-${selectedCustomerId}-${format(new Date(), 'yyyyMMdd')}.pdf`}>
                <Button className="rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-9">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-1 p-6 gap-6 items-start">
          {/* Left Panel - Filters */}
          <div className="w-80 shrink-0 space-y-6 flex flex-col sticky top-24">
            <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                  <Search className="w-4 h-4 text-primary" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Customer</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white h-11">
                      <SelectValue placeholder={isLoadingCustomers ? "Loading..." : "Select Customer"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      {customers?.map(c => (
                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="rounded-xl border-slate-200 bg-white h-11">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="ZiG">ZiG - Zimbabwe Gold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl border-slate-200 bg-white h-11", !startDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-2xl" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus className="rounded-2xl" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal rounded-xl border-slate-200 bg-white h-11", !endDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-slate-200 shadow-2xl" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus className="rounded-2xl" />
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>

            {statementData && (
              <Card className="rounded-2xl border-none shadow-sm bg-primary/5 p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Balance</span>
                  <Badge className={cn("rounded-lg", statementData.closingBalance > 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                    {currency} {statementData.closingBalance.toFixed(2)}
                  </Badge>
                </div>
              </Card>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex justify-center py-6 px-4">
            <div className="w-full max-w-[850px] bg-white shadow-2xl border border-slate-200 rounded-sm">
              {pdfBlobUrl ? (
                <iframe 
                  src={`${pdfBlobUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                  style={{ width: "100%", height: "1400px", border: "none", display: "block" }} 
                  scrolling="no"
                  title="Statement Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                    <FileText className="w-8 h-8 text-slate-200" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest">Select a customer to preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
        {isGenerating && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="font-bold text-slate-900 uppercase tracking-widest text-xs">Preparing Statement...</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
