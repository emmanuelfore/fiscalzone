import { Layout } from "@/components/layout";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useAuth } from "@/hooks/use-auth";
import { SalesReport, SalesByCustomerReport, SalesByItemReport, SalesBySalespersonReport } from "@/components/reports/sales-reports";
import { ArAgingSummaryReport, ArAgingDetailsReport, InvoiceDetailsReport, QuoteDetailsReport, CustomerBalanceSummaryReport, ReceivableSummaryReport, ReceivableDetailsReport, BadDebtsReport, BankChargesReport } from "@/components/reports/receivables-reports";
import { TimeToGetPaidReport, RefundHistoryReport, WithholdingTaxReport } from "@/components/reports/payments-reports";
import { ExpenseDetailsReport, ExpensesByCategoryReport, ExpensesByCustomerReport, ExpensesByProjectReport, BillableExpenseDetailsReport } from "@/components/reports/expenses-reports";
import { TaxSummaryReport } from "@/components/reports/tax-reports";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, BarChart3, FileText, CreditCard, ShoppingCart, Receipt, Search, Download, Loader2, RefreshCw, Calendar as CalendarIcon } from "lucide-react";
import { startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, format, isValid } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type DateRange } from "react-day-picker";
import { downloadCsv, generateCsv } from "@/lib/report-utils";

// ── Report definitions ────────────────────────────────────────────────────────

interface ReportDefinition {
  key: string;
  label: string;
  category: string;
  endpoint?: string;
  externalHref?: string;
}

const REPORT_CATEGORIES: {
  key: string;
  label: string;
  icon: React.ElementType;
  reports: ReportDefinition[];
}[] = [
  {
    key: "sales",
    label: "Sales",
    icon: BarChart3,
    reports: [
      { key: "sales", label: "Sales", category: "sales", endpoint: "sales-summary" },
      { key: "sales-by-customer", label: "Sales by Customer", category: "sales", endpoint: "sales-by-customer" },
      { key: "sales-by-item", label: "Sales by Item", category: "sales", endpoint: "sales-by-item" },
      { key: "sales-by-salesperson", label: "Sales by Sales Person", category: "sales", endpoint: "sales-by-salesperson" },
    ],
  },
  {
    key: "receivables",
    label: "Receivables",
    icon: FileText,
    reports: [
      { key: "ar-aging-summary", label: "AR Aging Summary", category: "receivables", endpoint: "ar-aging-summary" },
      { key: "ar-aging-details", label: "AR Aging Details", category: "receivables", endpoint: "ar-aging-details" },
      { key: "invoice-details", label: "Invoice Details", category: "receivables", endpoint: "invoice-details" },
      { key: "quote-details", label: "Quote Details", category: "receivables", endpoint: "quote-details" },
      { key: "bad-debts", label: "Bad Debts", category: "receivables", endpoint: "bad-debts" },
      { key: "bank-charges", label: "Bank Charges", category: "receivables", endpoint: "bank-charges" },
      { key: "customer-balance-summary", label: "Customer Balance Summary", category: "receivables", endpoint: "customer-balance-summary" },
      { key: "receivable-summary", label: "Receivable Summary", category: "receivables", endpoint: "receivable-summary" },
      { key: "receivable-details", label: "Receivable Details", category: "receivables", endpoint: "receivable-details" },
    ],
  },
  {
    key: "payments-received",
    label: "Payments Received",
    icon: CreditCard,
    reports: [
      { key: "payments-received", label: "Payments Received", category: "payments-received", externalHref: "/payments-received" },
      { key: "time-to-get-paid", label: "Time to Get Paid", category: "payments-received", endpoint: "time-to-get-paid" },
      { key: "refund-history", label: "Refund History", category: "payments-received", endpoint: "refund-history" },
      { key: "withholding-tax", label: "Withholding Tax", category: "payments-received", endpoint: "withholding-tax" },
    ],
  },
  {
    key: "purchases-expenses",
    label: "Purchases & Expenses",
    icon: ShoppingCart,
    reports: [
      { key: "expense-details", label: "Expense Details", category: "purchases-expenses", endpoint: "expense-details" },
      { key: "expenses-by-category", label: "Expenses by Category", category: "purchases-expenses", endpoint: "expenses-by-category" },
      { key: "expenses-by-customer", label: "Expenses by Customer", category: "purchases-expenses", endpoint: "expenses-by-customer" },
      { key: "expenses-by-project", label: "Expenses by Project", category: "purchases-expenses", endpoint: "expenses-by-project" },
      { key: "billable-expense-details", label: "Billable Expense Details", category: "purchases-expenses", endpoint: "billable-expense-details" },
    ],
  },
  {
    key: "taxes",
    label: "Taxes",
    icon: Receipt,
    reports: [
      { key: "tax-summary", label: "Tax Summary", category: "taxes", endpoint: "tax-summary" },
    ],
  },
];

// ── Shared types ──────────────────────────────────────────────────────────────

interface DateRangeState {
  from: Date;
  to: Date;
}

interface ReportContentProps {
  reportKey: string;
  companyId: number;
  dateRange: DateRangeState;
  onDateRangeChange: (range: DateRangeState) => void;
  search: string;
  onSearchChange: (s: string) => void;
  children?: React.ReactNode;
  // For StatBar
  totalAmount?: number;
  recordCount?: number;
  totalLabel?: string;
  // For CSV export
  csvData?: any[];
  csvColumns?: string[];
  csvFilename?: string;
  // Loading/error state
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

// ── ReportSidebar ─────────────────────────────────────────────────────────────

interface ReportSidebarProps {
  activeReport: string;
  onSelect: (key: string) => void;
  openCategories: Set<string>;
  onToggleCategory: (key: string) => void;
}

function ReportSidebar({ activeReport, onSelect, openCategories, onToggleCategory }: ReportSidebarProps) {
  return (
    <div className="w-64 shrink-0 flex flex-col border-r border-slate-200 bg-white sticky top-0 h-screen overflow-hidden">
      {/* Sidebar header */}
      <div className="px-4 py-3 border-b border-slate-100 shrink-0">
        <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Reports</span>
      </div>

      {/* Category groups */}
      <div className="flex-1 overflow-y-auto py-2">
        {REPORT_CATEGORIES.map((category) => {
          const isOpen = openCategories.has(category.key);
          const CategoryIcon = category.icon;

          return (
            <Collapsible
              key={category.key}
              open={isOpen}
              onOpenChange={() => onToggleCategory(category.key)}
              className="mb-0.5"
            >
              <CollapsibleTrigger asChild>
                <div className={cn(
                  "flex items-center justify-between w-full px-3 py-2.5 text-sm font-semibold transition-all duration-200 cursor-pointer select-none group",
                  category.reports.some(r => r.key === activeReport)
                    ? "text-violet-700 bg-violet-50"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                )}>
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors",
                      category.reports.some(r => r.key === activeReport)
                        ? "bg-violet-100 text-violet-600"
                        : "bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600"
                    )}>
                      <CategoryIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[13px] tracking-tight">{category.label}</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200 shrink-0",
                    isOpen ? "rotate-180 text-violet-400" : "text-slate-300"
                  )} />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-3 pl-3 border-l-2 border-slate-100 space-y-0.5 mt-0.5 pb-1">
                  {category.reports.map((report) => {
                    const isActive = report.key === activeReport;

                    if (report.externalHref) {
                      return (
                        <Link key={report.key} href={report.externalHref}>
                          <div className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer",
                            isActive
                              ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                          )}>
                            <span className="truncate">{report.label}</span>
                          </div>
                        </Link>
                      );
                    }

                    return (
                      <div
                        key={report.key}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 cursor-pointer",
                          isActive
                            ? "bg-violet-600 text-white shadow-sm shadow-violet-500/20"
                            : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                        )}
                        onClick={() => onSelect(report.key)}
                      >
                        <span className="truncate">{report.label}</span>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

// ── ReportContent ─────────────────────────────────────────────────────────────

function ReportContent({
  reportKey,
  companyId,
  dateRange,
  onDateRangeChange,
  search,
  onSearchChange,
  children,
  totalAmount,
  recordCount,
  totalLabel = "Total",
  csvData,
  csvColumns,
  csvFilename,
  isLoading,
  error,
  onRetry,
}: ReportContentProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleQuickSelect = (preset: "this-month" | "last-month" | "this-quarter" | "all-time") => {
    const now = new Date();
    switch (preset) {
      case "this-month":
        onDateRangeChange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case "last-month": {
        const last = subMonths(now, 1);
        onDateRangeChange({ from: startOfMonth(last), to: endOfMonth(last) });
        break;
      }
      case "this-quarter":
        onDateRangeChange({ from: startOfQuarter(now), to: endOfQuarter(now) });
        break;
      case "all-time":
        onDateRangeChange({ from: new Date("2000-01-01"), to: new Date("2099-12-31") });
        break;
    }
  };

  const handleExport = () => {
    if (!csvData || !csvColumns || !csvFilename) return;
    const csv = generateCsv(csvData, csvColumns);
    downloadCsv(csvFilename, csv);
  };

  const calendarRange: DateRange = { from: dateRange.from, to: dateRange.to };

  return (
    <div className="flex flex-col h-full">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-slate-100 bg-white shrink-0">
        {/* Date range picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 px-3 text-xs gap-1.5 border-slate-200 rounded-lg font-medium",
                calendarOpen && "border-violet-300 bg-violet-50 text-violet-700"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              {isValid(dateRange.from) && isValid(dateRange.to)
                ? `${format(dateRange.from, "dd MMM yyyy")} – ${format(dateRange.to, "dd MMM yyyy")}`
                : "Select date range"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.from}
              selected={calendarRange}
              onSelect={(r) => {
                if (r?.from && r?.to) {
                  onDateRangeChange({ from: r.from, to: r.to });
                  setCalendarOpen(false);
                } else if (r?.from) {
                  onDateRangeChange({ from: r.from, to: r.from });
                }
              }}
              numberOfMonths={2}
              className="p-3"
            />
          </PopoverContent>
        </Popover>

        {/* Quick-select buttons */}
        <div className="flex gap-1">
          {(["this-month", "last-month", "this-quarter", "all-time"] as const).map((preset) => (
            <Button
              key={preset}
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-[11px] font-semibold text-slate-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg capitalize"
              onClick={() => handleQuickSelect(preset)}
            >
              {preset === "this-month" ? "This Month" : preset === "last-month" ? "Last Month" : preset === "this-quarter" ? "This Quarter" : "All Time"}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search..."
            className="pl-8 h-8 text-xs border-slate-200 rounded-lg w-48"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Export button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs gap-1.5 border-slate-200 rounded-lg"
          disabled={!csvData || csvData.length === 0}
          onClick={handleExport}
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Stat bar */}
      {(totalAmount !== undefined || recordCount !== undefined) && (
        <div className="flex items-center gap-6 px-6 py-2.5 bg-slate-50 border-b border-slate-100 shrink-0">
          {totalAmount !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{totalLabel}</span>
              <span className="text-sm font-black text-slate-800">{totalAmount.toFixed(2)}</span>
            </div>
          )}
          {recordCount !== undefined && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Records</span>
              <span className="text-sm font-black text-slate-800">{recordCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            <span className="text-sm font-medium">Loading report...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
            <p className="text-sm font-medium text-red-500">Failed to load report</p>
            <p className="text-xs text-slate-400">{error.message}</p>
            {onRetry && (
              <Button variant="outline" size="sm" className="gap-1.5 mt-1" onClick={onRetry}>
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </Button>
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// ── ActiveReportComponent ─────────────────────────────────────────────────────

function ActiveReportComponent({ reportKey, companyId, dateRange, search }: {
  reportKey: string;
  companyId: number;
  dateRange: { from: Date; to: Date };
  search: string;
}) {
  const props = { companyId, dateRange, search };
  switch (reportKey) {
    case "sales": return <SalesReport {...props} />;
    case "sales-by-customer": return <SalesByCustomerReport {...props} />;
    case "sales-by-item": return <SalesByItemReport {...props} />;
    case "sales-by-salesperson": return <SalesBySalespersonReport {...props} />;
    case "ar-aging-summary": return <ArAgingSummaryReport {...props} />;
    case "ar-aging-details": return <ArAgingDetailsReport {...props} />;
    case "invoice-details": return <InvoiceDetailsReport {...props} />;
    case "quote-details": return <QuoteDetailsReport {...props} />;
    case "customer-balance-summary": return <CustomerBalanceSummaryReport {...props} />;
    case "receivable-summary": return <ReceivableSummaryReport companyId={companyId} dateRange={dateRange} />;
    case "receivable-details": return <ReceivableDetailsReport {...props} />;
    case "bad-debts": return <BadDebtsReport {...props} />;
    case "bank-charges": return <BankChargesReport {...props} />;
    case "time-to-get-paid": return <TimeToGetPaidReport {...props} />;
    case "refund-history": return <RefundHistoryReport {...props} />;
    case "withholding-tax": return <WithholdingTaxReport {...props} />;
    case "expense-details": return <ExpenseDetailsReport {...props} />;
    case "expenses-by-category": return <ExpensesByCategoryReport {...props} />;
    case "expenses-by-customer": return <ExpensesByCustomerReport {...props} />;
    case "expenses-by-project": return <ExpensesByProjectReport {...props} />;
    case "billable-expense-details": return <BillableExpenseDetailsReport {...props} />;
    case "tax-summary": return <TaxSummaryReport {...props} />;
    default: return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p className="text-sm">Select a report from the sidebar</p>
      </div>
    );
  }
}

// ── ReportsPage ───────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();
  const { activeCompanyId, isLoading } = useActiveCompany(!!user);

  const [activeReport, setActiveReport] = useState<string>("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(["sales", "receivables"])
  );
  const [dateRange, setDateRange] = useState<DateRangeState>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [search, setSearch] = useState("");

  const handleToggleCategory = (key: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectReport = (key: string) => {
    setActiveReport(key);
    // Auto-expand the category containing this report
    const category = REPORT_CATEGORIES.find(c => c.reports.some(r => r.key === key));
    if (category) {
      setOpenCategories(prev => new Set([...prev, category.key]));
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-slate-400">
          Loading...
        </div>
      </Layout>
    );
  }

  if (!activeCompanyId) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500 font-medium">Please select a company to view reports</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex -mx-4 sm:-mx-8 -mt-6">
        {/* Left: Report Sidebar */}
        <ReportSidebar
          activeReport={activeReport}
          onSelect={handleSelectReport}
          openCategories={openCategories}
          onToggleCategory={handleToggleCategory}
        />

        {/* Right: Report Content */}
        <div className="flex-1 min-w-0 flex flex-col bg-white">
          {!activeReport ? (
            <div className="flex items-center justify-center h-full min-h-[400px] text-slate-400">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                <p className="font-medium text-slate-500">Select a report from the sidebar</p>
                <p className="text-sm text-slate-400 mt-1">Choose a category and report to get started</p>
              </div>
            </div>
          ) : (
            <ReportContent
              reportKey={activeReport}
              companyId={activeCompanyId}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              search={search}
              onSearchChange={setSearch}
            >
              <ActiveReportComponent
                reportKey={activeReport}
                companyId={activeCompanyId}
                dateRange={dateRange}
                search={search}
              />
            </ReportContent>
          )}
        </div>
      </div>
    </Layout>
  );
}
