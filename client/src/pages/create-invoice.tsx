import { Layout } from "@/components/layout";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useCurrencies } from "@/hooks/use-currencies";
import { useCompany } from "@/hooks/use-companies";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, Loader2, ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/invoices/pdf-document";
import { Eye, Download } from "lucide-react";

type LineItem = {
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
};

export default function CreateInvoicePage() {
  const [, setLocation] = useLocation();
  const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
  const { data: company } = useCompany(companyId);
  const { data: customers } = useCustomers(companyId);
  const { data: products } = useProducts(companyId);
  const { data: currencies } = useCurrencies(companyId);
  const createInvoice = useCreateInvoice(companyId);
  const createCustomer = useCreateCustomer(companyId);
  const { toast } = useToast();

  // Form State
  const [customerId, setCustomerId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [taxInclusive, setTaxInclusive] = useState<boolean>(false);
  const [items, setItems] = useState<LineItem[]>([
    { productId: null, description: "", quantity: 1, unitPrice: 0, taxRate: 15 }
  ]);

  // Banking State (Defaults)
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");

  // Effect to load defaults from company
  useEffect(() => {
    if (selectedCompany) {
      setBankName(selectedCompany.bankName || "");
      setAccountName(selectedCompany.accountName || "");
      setAccountNumber(selectedCompany.accountNumber || "");
      setBranchCode(selectedCompany.branchCode || "");
      setTaxInclusive(selectedCompany.vatEnabled ?? false);
    }
  }, [selectedCompany]);

  // Currency State
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState("1.000000");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const handleCurrencyChange = (code: string) => {
    setCurrencyCode(code);
    const currency = currencies?.find(c => c.code === code);
    if (currency) {
      setExchangeRate(currency.exchangeRate);
    }
  };

  const currentSymbol = currencies?.find(c => c.code === currencyCode)?.symbol || "$";

  // New Customer Modal State
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);

  const handleAddItem = () => {
    setItems([...items, { productId: null, description: "", quantity: 1, unitPrice: 0, taxRate: 15 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products?.find(p => p.id === parseInt(productId));
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        productId: product.id,
        description: product.name,
        unitPrice: Number(product.price),
        taxRate: Number(product.taxRate || 15)
      };
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let taxAmount = 0;

    items.forEach(item => {
      const lineTotal = item.quantity * item.unitPrice;

      if (taxInclusive) {
        // Price includes tax: Tax = Total - (Total / (1 + Rate))
        const taxPortion = lineTotal - (lineTotal / (1 + (item.taxRate / 100)));
        const netPortion = lineTotal - taxPortion;
        subtotal += netPortion;
        taxAmount += taxPortion;
      } else {
        // Price excludes tax: Tax = Total * Rate
        const taxPortion = lineTotal * (item.taxRate / 100);
        subtotal += lineTotal;
        taxAmount += taxPortion;
      }
    });

    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount
    };
  };

  const { subtotal, taxAmount, total } = calculateTotals();



  const handleSubmit = async () => {
    if (!customerId) {
      toast({
        title: "Validation Error",
        description: "Please select a customer.",
        variant: "destructive",
      });
      return;
    }

    if (!dueDate) {
      toast({
        title: "Validation Error",
        description: "Please select a due date.",
        variant: "destructive",
      });
      return;
    }

    // Generate mock invoice number for now - backend might override
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    try {
      await createInvoice.mutateAsync({
        invoiceNumber,
        customerId: parseInt(customerId),
        dueDate: new Date(dueDate),
        notes,
        currency: currencyCode,
        exchangeRate: exchangeRate,
        paymentMethod,
        status: "draft",
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        total: total.toString(),
        taxInclusive: taxInclusive,
        items: items.map(item => {
          // Calculate line total sent to backend based on inclusive/exclusive
          // Usually backend expects unitPrice and quantity, and calculates.
          // We send what's on the line.
          const rawLineTotal = item.quantity * item.unitPrice;
          return {
            productId: item.productId,
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            taxRate: item.taxRate.toString(),
            lineTotal: rawLineTotal.toString()
          };
        })
      });
      setLocation("/invoices");
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerName) return;
    try {
      await createCustomer.mutateAsync({
        name: newCustomerName,
        customerType: "individual"
      });
      setCustomerModalOpen(false);
      setNewCustomerName("");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/invoices")} className="pl-0 hover:pl-0 hover:bg-transparent text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Eye className="w-4 h-4" />
                Preview PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh]">
              <DialogHeader>
                <DialogTitle>Invoice Preview</DialogTitle>
              </DialogHeader>
              <div className="flex-1 h-full min-h-[500px] w-full bg-slate-100 rounded-md overflow-hidden">
                {customerId && company ? (
                  <PDFViewer width="100%" height="100%" className="w-full h-full">
                    <InvoicePDF
                      invoice={{
                        invoiceNumber: "DRAFT",
                        issueDate: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
                        dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
                        status: "draft",
                        items: items.map(item => ({
                          ...item,
                          lineTotal: (item.quantity * item.unitPrice).toString()
                        })),
                        subtotal: subtotal.toString(),
                        taxAmount: taxAmount.toString(),
                        total: total.toString(),
                        currency: currencyCode,
                        taxInclusive,
                        notes,
                        currencySymbol: currentSymbol
                      }}
                      company={{
                        ...selectedCompany,
                        bankName,
                        accountName,
                        accountNumber,
                        branchCode
                      }}
                      customer={customers?.find(c => c.id.toString() === customerId)}
                    />
                  </PDFViewer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    Please select a customer and ensure company details are loaded to preview PDF.
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                {customerId && company && (
                  <PDFDownloadLink
                    document={
                      <InvoicePDF
                        invoice={{
                          invoiceNumber: "DRAFT",
                          issueDate: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
                          dueDate: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
                          status: "draft",
                          items: items.map(item => ({
                            ...item,
                            lineTotal: (item.quantity * item.unitPrice).toString()
                          })),
                          subtotal: subtotal.toString(),
                          taxAmount: taxAmount.toString(),
                          total: total.toString(),
                          currency: currencyCode,
                          taxInclusive,
                          notes,
                          currencySymbol: currentSymbol
                        }}
                        company={{
                          ...selectedCompany,
                          bankName,
                          accountName,
                          accountNumber,
                          branchCode
                        }}
                        customer={customers?.find(c => c.id.toString() === customerId)}
                      />
                    }
                    fileName={`Invoice-Draft.pdf`}
                  >
                    {({ blob, url, loading, error }) => (
                      <Button disabled={loading} className="gap-2">
                        <Download className="w-4 h-4" />
                        {loading ? 'Generating...' : 'Download PDF'}
                      </Button>
                    )}
                  </PDFDownloadLink>
                )}
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="gap-2">
            Save Draft
          </Button>
          <Button
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={handleSubmit}
            disabled={createInvoice.isPending || !customerId}
          >
            {createInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Issue Invoice"}
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">
        <Card className="bg-white shadow-lg border-slate-200 p-8 md:p-12 min-h-[1100px] text-sm">
          {/* Header Row */}
          <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">FISCAL TAX INVOICE</h2>
              <p className="text-slate-500">Original Document</p>
            </div>

            <div className="flex flex-col items-end gap-4">
              <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                <Button
                  variant={taxInclusive ? "ghost" : "secondary"}
                  size="sm"
                  onClick={() => setTaxInclusive(false)}
                  className="text-xs font-medium"
                >
                  Tax Exclusive
                </Button>
                <Button
                  variant={taxInclusive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setTaxInclusive(true)}
                  className="text-xs font-medium"
                >
                  Tax Inclusive
                </Button>
              </div>
              <Select defaultValue="standard">
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Select Template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Invoice</SelectItem>
                  <SelectItem value="modern" disabled>Modern (Pro)</SelectItem>
                  <SelectItem value="minimal" disabled>Minimal (Pro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
            {/* Seller Details */}
            <div className="space-y-4">
              <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Seller</div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">{company?.tradingName || company?.name || "Company Name"}</h3>
                <div className="text-slate-600 space-y-1 mt-2">
                  <p>TIN: <span className="font-mono text-slate-900">{company?.tin || "-"}</span></p>
                  <p>VAT No: <span className="font-mono text-slate-900">{company?.vatNumber || "-"}</span></p>
                  <p>{company?.address || "Address Line 1"}</p>
                  <p>{company?.city}, {company?.country}</p>
                  <p className="pt-1">{company?.email} | {company?.phone}</p>
                </div>
              </div>
            </div>

            {/* Invoice Metadata */}
            <div className="space-y-4">
              <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider text-right">Invoice Details</div>
              <div className="grid grid-cols-[1fr_1.5fr] gap-4 text-right">
                <div className="text-slate-500 py-2">Invoice No:</div>
                <div className="font-mono font-medium bg-slate-50 py-2 px-3 rounded text-slate-700">[Auto-Generated]</div>

                <div className="text-slate-500 py-2">Fiscal Day:</div>
                <div className="font-mono font-medium bg-slate-50 py-2 px-3 rounded text-slate-700">[Auto-Generated]</div>

                <div className="text-slate-500 flex items-center justify-end">Date:</div>
                <div>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="text-right h-9 border-slate-200"
                    required
                  />
                </div>

                <div className="text-slate-500 flex items-center justify-end">Due Date:</div>
                <div>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-right h-9 border-slate-200"
                    required
                  />
                </div>

                <div className="text-slate-500 flex items-center justify-end">Currency:</div>
                <div className="flex justify-end">
                  <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                    <SelectTrigger className="w-full text-right h-9 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies?.map(c => (
                        <SelectItem key={c.id} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-slate-500 flex items-center justify-end">Payment Method:</div>
                <div className="flex justify-end">
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-full text-right h-9 border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CARD">Card / Swipe</SelectItem>
                      <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="ECOCASH">Ecocash / Mobile</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-slate-500 py-2">Fiscal Device ID:</div>
                <div className="font-mono text-xs py-2">{company?.fdmsDeviceId || "Not Registered"}</div>
              </div>
              <div className="text-[10px] text-slate-400 text-right">
                Verification code will be generated on submission
              </div>
            </div>
          </div>

          <div className="mb-12">
            <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-4">Buyer</div>
            <div className="bg-slate-50/50 p-6 rounded-lg border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between bg-white border-slate-200 h-10"
                        >
                          {customerId
                            ? customers?.find((customer) => customer.id.toString() === customerId)?.name
                            : "Select a client or search..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search customer..." />
                          <CommandList>
                            <CommandEmpty>No customer found.</CommandEmpty>
                            <CommandGroup>
                              {customers?.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={`${customer.name} ${customer.tin || ""} ${customer.email || ""}`}
                                  onSelect={() => {
                                    setCustomerId(customer.id.toString());
                                    setOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      customerId === customer.id.toString() ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{customer.name}</span>
                                    {(customer.tin || customer.email) && (
                                      <span className="text-xs text-muted-foreground">
                                        {[customer.tin, customer.email].filter(Boolean).join(" | ")}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Dialog open={isCustomerModalOpen} onOpenChange={setCustomerModalOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0 h-10 w-10">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Customer</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="space-y-2">
                            <Label>Customer Name</Label>
                            <Input
                              value={newCustomerName}
                              onChange={e => setNewCustomerName(e.target.value)}
                              placeholder="John Doe"
                            />
                          </div>
                          <Button onClick={handleCreateCustomer} className="w-full" disabled={createCustomer.isPending}>
                            {createCustomer.isPending ? "Adding..." : "Add Customer"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {/* Selected Customer Details */}
                  {customerId && (
                    <div className="text-sm text-slate-600 pl-1 space-y-1">
                      {(() => {
                        const c = customers?.find(cust => cust.id.toString() === customerId);
                        if (!c) return null;
                        return (
                          <>
                            <div className="font-medium text-slate-900">{c.name}</div>
                            <div>TIN: {c.tin || "-"}</div>
                            <div>VAT: {c.vatNumber || "-"}</div>
                            <div>{c.address}</div>
                            <div>{c.email} {c.phone && `| ${c.phone}`}</div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider mb-4">Invoice Items</div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="w-[80px]">Quantity</TableHead>
                  <TableHead className="w-[100px]">Unit Price</TableHead>
                  <TableHead className="w-[80px]">Tax (%)</TableHead>
                  <TableHead className="w-[100px] text-right">Excl. Tax</TableHead>
                  <TableHead className="w-[100px] text-right">VAT</TableHead>
                  <TableHead className="w-[100px] text-right">Total</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const lineVal = item.quantity * item.unitPrice;
                  let exclTax = 0;
                  let vatAmt = 0;
                  let totalAmt = 0;

                  if (taxInclusive) {
                    const taxFactor = 1 + (item.taxRate / 100);
                    totalAmt = lineVal;
                    const baseAmt = lineVal / taxFactor;
                    vatAmt = lineVal - baseAmt;
                    exclTax = baseAmt;
                  } else {
                    exclTax = lineVal;
                    vatAmt = lineVal * (item.taxRate / 100);
                    totalAmt = exclTax + vatAmt;
                  }

                  return (
                    <TableRow key={index}>
                      <TableCell className="align-top">
                        <Popover
                          open={openRowIndex === index}
                          onOpenChange={(isOpen) => setOpenRowIndex(isOpen ? index : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-[180px] bg-transparent border-transparent hover:border-slate-200 h-9 p-2 justify-between font-normal focus:ring-0"
                            >
                              {item.productId
                                ? products?.find((p) => p.id === item.productId)?.name || "Select Product"
                                : "Select Product"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search product..." />
                              <CommandList>
                                <CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup>
                                  {products?.map((product) => (
                                    <CommandItem
                                      key={product.id}
                                      value={`${product.name} ${product.sku || ""}`}
                                      onSelect={() => {
                                        handleProductSelect(index, product.id.toString());
                                        setOpenRowIndex(null);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          item.productId === product.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{product.name}</span>
                                        <div className="flex justify-between w-full text-xs text-muted-foreground">
                                          <span>{product.sku}</span>
                                          <span>${Number(product.price).toFixed(2)}</span>
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          placeholder="Description..."
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="bg-transparent border-transparent hover:border-slate-200 h-9 p-2 focus-visible:ring-0 focus-visible:border-primary"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="bg-transparent border-transparent hover:border-slate-200 h-9 p-2 focus-visible:ring-0 focus-visible:border-primary"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="bg-transparent border-transparent hover:border-slate-200 h-9 p-2 focus-visible:ring-0 focus-visible:border-primary"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                          className="bg-transparent border-transparent hover:border-slate-200 h-9 p-2 text-right focus-visible:ring-0 focus-visible:border-primary"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-600 align-middle">
                        {exclTax.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-600 align-middle">
                        {vatAmt.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-bold font-mono align-middle">
                        {totalAmt.toFixed(2)}
                      </TableCell>
                      <TableCell className="align-middle">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Button variant="ghost" onClick={handleAddItem} className="text-primary hover:text-primary hover:bg-primary/5 pl-2">
                <Plus className="w-4 h-4 mr-2" /> Add Line Item
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
            {/* Left Column: Notes & Banking */}
            <div className="space-y-8">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-slate-400">Notes</Label>
                <Textarea
                  placeholder="Invoice notes, terms and conditions, payment instructions, etc."
                  className="bg-slate-50 border-slate-200 min-h-[100px] resize-none text-sm"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <p className="text-[10px] text-slate-400">These notes will appear on the invoice</p>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-semibold uppercase text-slate-400">Banking Details</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Input placeholder="Bank Name" value={bankName} onChange={e => setBankName(e.target.value)} className="bg-slate-50 border-slate-200" />
                  <Input placeholder="Account Name" value={accountName} onChange={e => setAccountName(e.target.value)} className="bg-slate-50 border-slate-200" />
                  <Input placeholder="Account Number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="bg-slate-50 border-slate-200" />
                  <Input placeholder="Branch Code" value={branchCode} onChange={e => setBranchCode(e.target.value)} className="bg-slate-50 border-slate-200" />
                </div>
              </div>
            </div>

            {/* Right Column: Totals & Verification */}
            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-lg space-y-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{currentSymbol}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax</span>
                  <span className="font-mono">{currentSymbol}{taxAmount.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between font-bold text-xl text-slate-900">
                  <span>Total</span>
                  <span className="font-mono">{currentSymbol}{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-[80px_1fr] gap-4">
                <div className="bg-white border-2 border-slate-100 rounded-lg h-20 w-20 flex items-center justify-center text-[10px] text-slate-400 text-center p-1">
                  [QR]
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase text-slate-400">Verification</div>
                  <div className="text-sm font-medium text-slate-700">Will be generated on submission</div>
                  <div className="text-xs text-slate-500">Verify at <span className="text-primary underline">https://receipt.zimra.org/</span></div>
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-400 pt-4">
                Invoice is issued according to ZIMRA regulations
              </div>
            </div>
          </div>

        </Card>
      </div>
    </Layout>
  );
}
