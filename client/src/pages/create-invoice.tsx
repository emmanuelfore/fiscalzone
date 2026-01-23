import { Layout } from "@/components/layout";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useProducts, useCreateProduct } from "@/hooks/use-products";
import { useCreateInvoice, useInvoice, useUpdateInvoice } from "@/hooks/use-invoices";
import { useAuth } from "@/hooks/use-auth";
import { useCurrencies } from "@/hooks/use-currencies";
import { useCompany } from "@/hooks/use-companies";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Plus, Trash2, Loader2, ArrowLeft, Check, ChevronsUpDown, ShieldCheck, Send, Lock, ClipboardList } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

type LineItem = {
  localId: string;
  productId: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  hsCode?: string;
};

export default function CreateInvoicePage() {
  const [location, setLocation] = useLocation();
  const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");

  // Check if we're editing an existing invoice
  // wouter useLocation returns only path, so we use window.location.search
  const searchParams = new URLSearchParams(window.location.search);
  const editId = searchParams.get('edit');
  const duplicateId = searchParams.get('duplicate');
  const isEditing = !!editId;
  const isDuplicating = !!duplicateId;

  console.log("Location info:", { path: location, search: window.location.search, editId, duplicateId, isEditing });

  const { data: company } = useCompany(companyId);
  const { data: customers } = useCustomers(companyId);
  const { data: products } = useProducts(companyId);
  const { data: currencies } = useCurrencies(companyId);
  // Fetch existing invoice if we are editing OR duplicating
  const sourceId = editId || duplicateId;
  const { data: existingInvoice } = useInvoice(sourceId ? parseInt(sourceId) : 0);
  const createInvoice = useCreateInvoice(companyId);
  const createCustomer = useCreateCustomer(companyId);
  const { taxTypes } = useTaxConfig();
  const { toast } = useToast();
  const updateInvoice = useUpdateInvoice();
  const createProduct = useCreateProduct(companyId);
  const { user } = useAuth();

  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockStatus, setLockStatus] = useState<string>("");

  // Lock invoice on mount/edit (ONLY if editing, not if duplicating)
  useEffect(() => {
    if (!isEditing || !user || !editId) return;

    const lockInvoice = async () => {
      try {
        const res = await fetch(`/api/invoices/${editId}/lock`, { method: "POST" });
        if (res.status === 409) {
          setIsLockedByOther(true);
          setLockStatus("This invoice is currently being edited by another user.");
          toast({
            title: "Invoice Locked",
            description: "This invoice is currently being edited by another user.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Lock error", error);
      }
    };

    lockInvoice();

    // Unlock on unmount
    return () => {
      if (!isLockedByOther) {
        fetch(`/api/invoices/${editId}/unlock`, { method: "POST" }).catch(console.error);
      }
    };
  }, [isEditing, user, editId, isLockedByOther]);

  // Pre-fill form when editing or duplicating
  useEffect(() => {
    console.log("Form Population Effect:", { isEditing, isDuplicating, existingInvoice });
    if (existingInvoice && (isEditing || isDuplicating)) {
      console.log("Populating form with:", existingInvoice);
      if (existingInvoice.customerId) setCustomerId(existingInvoice.customerId.toString());

      // If duplicating, set date to today, otherwise keep original issue date
      if (isDuplicating) {
        setIssueDate(new Date().toISOString().split('T')[0]);
        // Default due date to 14 days from now for duplicate? Or keep original offset? 
        // Let's just keep original due date logic or default to +14 days if we wanted smartness.
        // For now, let's just default to today + 14 days to be safe, or keep blank?
        // Actually, let's set it to today + 30 days default if duplicating to avoid stale dates
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 30);
        setDueDate(nextMonth.toISOString().split('T')[0]);
      } else {
        if (existingInvoice.issueDate) setIssueDate(new Date(existingInvoice.issueDate).toISOString().split('T')[0]);
        if (existingInvoice.dueDate) setDueDate(new Date(existingInvoice.dueDate).toISOString().split('T')[0]);
      }

      setNotes(existingInvoice.notes || "");
      setTaxInclusive(existingInvoice.taxInclusive || false);
      setCurrencyCode(existingInvoice.currency || "USD");
      setExchangeRate(existingInvoice.exchangeRate || "1.000000"); // Ensure we copy exchange rate too
      setPaymentMethod(existingInvoice.paymentMethod || "CASH");

      if (existingInvoice.items && existingInvoice.items.length > 0) {
        console.log("Populating items:", existingInvoice.items);
        setItems(existingInvoice.items.map(item => ({
          localId: Math.random().toString(36).substring(2, 11),
          productId: item.productId,
          description: item.description || "",
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          hsCode: (item as any).product?.hsCode || undefined
        })));
      }
    }
  }, [existingInvoice, isEditing, isDuplicating]);

  // Form State
  const [customerId, setCustomerId] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [taxInclusive, setTaxInclusive] = useState<boolean>(false);
  const [items, setItems] = useState<LineItem[]>([
    { localId: Math.random().toString(36).substring(2, 11), productId: null, description: "", quantity: 1, unitPrice: 0, taxRate: 15 }
  ]);
  const [isRestored, setIsRestored] = useState(false);

  const clearAutoSave = () => {
    localStorage.removeItem(`invoice_draft_${companyId}`);
  };

  // Banking State (Defaults)
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchCode, setBranchCode] = useState("");

  // Effect to load defaults from company
  useEffect(() => {
    if (company) {
      setBankName(company.bankName || "");
      setAccountName(company.accountName || "");
      setAccountNumber(company.accountNumber || "");
      setBranchCode(company.branchCode || "");
      setTaxInclusive(company.vatEnabled ?? false);
    }
  }, [company]);

  // Currency State
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState("1.000000");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const handleCurrencyChange = (code: string) => {
    const newCurrency = currencies?.find(c => c.code === code);
    if (!newCurrency) return;

    const oldRate = Number(exchangeRate);
    const newRate = Number(newCurrency.exchangeRate);

    // Update all item prices based on rate change
    const scaledItems = items.map(item => ({
      ...item,
      unitPrice: (item.unitPrice / oldRate) * newRate
    }));

    setItems(scaledItems);
    setCurrencyCode(code);
    setExchangeRate(newCurrency.exchangeRate);
  };

  const currentSymbol = currencies?.find(c => c.code === currencyCode)?.symbol || "$";

  // New Customer Modal State
  const [isCustomerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [openRowIndex, setOpenRowIndex] = useState<number | null>(null);

  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState<Record<string, string>>({});

  // Auto-Save: Persist to localStorage (MOVED DOWN)
  useEffect(() => {
    if (isEditing || isDuplicating) return;

    const timer = setTimeout(() => {
      const draftState = {
        customerId,
        items,
        notes,
        currencyCode,
        exchangeRate,
        paymentMethod,
        taxInclusive,
        issueDate,
        dueDate
      };
      localStorage.setItem(`invoice_draft_${companyId}`, JSON.stringify(draftState));
    }, 1000);

    return () => clearTimeout(timer);
  }, [customerId, items, notes, currencyCode, exchangeRate, paymentMethod, taxInclusive, issueDate, dueDate, isEditing, isDuplicating, companyId]);

  // Restore State on Mount (MOVED DOWN)
  useEffect(() => {
    if (isEditing || isDuplicating || isRestored) return;

    const saved = localStorage.getItem(`invoice_draft_${companyId}`);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.customerId) setCustomerId(state.customerId);
        if (state.items) setItems(state.items);
        if (state.notes) setNotes(state.notes);
        if (state.currencyCode) setCurrencyCode(state.currencyCode);
        if (state.exchangeRate) setExchangeRate(state.exchangeRate);
        if (state.paymentMethod) setPaymentMethod(state.paymentMethod);
        if (state.taxInclusive) setTaxInclusive(state.taxInclusive);
        if (state.issueDate) setIssueDate(state.issueDate);
        if (state.dueDate) setDueDate(state.dueDate);
        setIsRestored(true);
        toast({
          title: "Draft Restored",
          description: "We restored your last unsaved invoice.",
        });
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
  }, [companyId, isEditing, isDuplicating, isRestored, toast]);

  const handleAddItem = () => {
    setItems([...items, { localId: Math.random().toString(36).substring(2, 11), productId: null, description: "", quantity: 1, unitPrice: 0, taxRate: 15 }]);
  };

  const handleRemoveItem = (localId: string) => {
    setItems(items.filter(item => item.localId !== localId));
  };

  const handleProductSelect = (localId: string, productId: string) => {
    const product = products?.find(p => p.id === parseInt(productId));
    if (product) {
      setItems(prev => prev.map(item => {
        if (item.localId !== localId) return item;

        // Determine tax rate: prefer master tax type if linked, otherwise fallback to product override
        let taxRate = Number(product.taxRate ?? 15);
        if ((product as any).taxTypeId && taxTypes.data) {
          const found = taxTypes.data.find(t => t.id === (product as any).taxTypeId);
          if (found) taxRate = Number(found.rate);
        }

        const rate = Number(exchangeRate);
        const scaledPrice = Number(product.price) * rate;

        return {
          ...item,
          productId: product.id,
          description: product.name,
          quantity: 1,
          unitPrice: scaledPrice,
          taxRate: taxRate,
          hsCode: product.hsCode || "0000"
        };
      }));
    }
  };

  const updateItem = (localId: string, field: keyof LineItem, value: any) => {
    setItems(prev => prev.map(item =>
      item.localId === localId ? { ...item, [field]: value } : item
    ));
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

  const calculateTaxBreakdown = () => {
    const breakdown: Record<number, { net: number, tax: number }> = {};

    items.forEach(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const rate = Number(item.taxRate);

      if (!breakdown[rate]) breakdown[rate] = { net: 0, tax: 0 };

      if (taxInclusive) {
        const taxPortion = lineTotal - (lineTotal / (1 + (rate / 100)));
        breakdown[rate].net += (lineTotal - taxPortion);
        breakdown[rate].tax += taxPortion;
      } else {
        const taxPortion = lineTotal * (rate / 100);
        breakdown[rate].net += lineTotal;
        breakdown[rate].tax += taxPortion;
      }
    });

    return breakdown;
  };

  const taxBreakdown = calculateTaxBreakdown();



  const [loadingAction, setLoadingAction] = useState<'draft' | 'issue' | 'quote' | null>(null);

  const handleSaveDraft = async () => {
    setLoadingAction('draft');
    if (!customerId) {
      toast({
        title: "Validation Error",
        description: "Please select a customer.",
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    }

    if (!dueDate) {
      toast({
        title: "Validation Error",
        description: "Please select a due date.",
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    }

    const invoiceNumber = isEditing && existingInvoice
      ? existingInvoice.invoiceNumber
      : `DRAFT-${Date.now().toString().slice(-6)}`;

    // Common data payload
    const invoiceData = {
      companyId,
      invoiceNumber,
      customerId: parseInt(customerId),
      issueDate: issueDate ? new Date(issueDate) : new Date(),
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
    };

    // Credit Note / Debit Note Validation: Notes are mandatory
    const isCnDn = existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote";
    if (isCnDn && !notes?.trim()) {
      toast({
        title: "Notes Required",
        description: `Please provide a reason/notes for this ${existingInvoice?.transactionType === "CreditNote" ? "Credit Note" : "Debit Note"}.`,
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    }

    try {
      if (isEditing && editId) {
        await updateInvoice.mutateAsync({
          id: parseInt(editId),
          data: invoiceData
        });
        toast({
          title: "Draft Updated",
          description: "Draft invoice updated successfully.",
        });
      } else {
        await createInvoice.mutateAsync(invoiceData);
        toast({
          title: "Draft Saved",
          description: "Invoice saved as draft successfully.",
        });
      }
      setLocation("/invoices");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveQuotation = async () => {
    setLoadingAction('quote');
    if (!customerId) {
      toast({
        title: "Validation Error",
        description: "Please select a customer.",
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    }

    const invoiceNumber = isEditing && existingInvoice
      ? existingInvoice.invoiceNumber
      : `QT-${Date.now().toString().slice(-6)}`;

    const invoiceData = {
      companyId,
      invoiceNumber,
      customerId: parseInt(customerId),
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days for quotes
      notes,
      currency: currencyCode,
      exchangeRate: exchangeRate,
      paymentMethod,
      status: "quote",
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      total: total.toString(),
      taxInclusive: taxInclusive,
      items: items.map(item => {
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
    };

    // Credit Note / Debit Note Validation: Notes are mandatory
    const isCnDn = existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote";
    if (isCnDn && !notes?.trim()) {
      toast({
        title: "Notes Required",
        description: `Please provide a reason/notes for this ${existingInvoice?.transactionType === "CreditNote" ? "Credit Note" : "Debit Note"}.`,
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    }

    try {
      if (isEditing && editId) {
        await updateInvoice.mutateAsync({
          id: parseInt(editId),
          data: invoiceData
        });
        toast({
          title: "Quotation Updated",
          description: "Quotation updated successfully.",
        });
      } else {
        await createInvoice.mutateAsync(invoiceData);
        toast({
          title: "Quotation Saved",
          description: "Quotation saved successfully.",
        });
      }
      setLocation("/quotations");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save quotation",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleIssue = async () => {
    setLoadingAction('issue');
    if (!customerId) {
      toast({
        title: "Validation Error",
        description: "Please select a customer.",
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    }

    if (items.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item to the invoice.",
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    }

    if (!dueDate) {
      toast({
        title: "Validation Error",
        description: "Please select a due date.",
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    }


    const invoiceNumber = isEditing && existingInvoice && existingInvoice.status === 'issued'
      ? existingInvoice.invoiceNumber
      : `INV-${Date.now().toString().slice(-6)}`;

    // Common data payload
    const invoiceData = {
      companyId,
      invoiceNumber,
      customerId: parseInt(customerId),
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: new Date(dueDate),
      notes,
      currency: currencyCode,
      exchangeRate: exchangeRate,
      paymentMethod,
      status: "issued",
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      total: total.toString(),
      taxInclusive: taxInclusive,
      items: items.map(item => {
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
    };

    // Credit Note / Debit Note Validation: Notes are mandatory
    const isCnDn = existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote";
    if (isCnDn && !notes?.trim()) {
      toast({
        title: "Notes Required",
        description: `Please provide a reason/notes for this ${existingInvoice?.transactionType === "CreditNote" ? "Credit Note" : "Debit Note"}.`,
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    }

    try {
      if (isEditing && editId) {
        await updateInvoice.mutateAsync({
          id: parseInt(editId),
          data: invoiceData
        });
        toast({
          title: "Invoice Updated & Issued",
          description: "Invoice updated and issued successfully. You can now fiscalize it.",
        });
      } else {
        await createInvoice.mutateAsync(invoiceData);
        toast({
          title: "Invoice Issued",
          description: "Invoice issued successfully. You can now fiscalize it.",
        });
      }
      setLocation("/invoices");
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setLoadingAction(null);
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
      {isLockedByOther && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <Lock className="h-5 w-5 text-amber-500" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                {lockStatus}
                <span className="block mt-1 text-xs opacity-75">You can view this invoice but cannot make changes.</span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setLocation("/invoices")} className="pl-0 hover:pl-0 hover:bg-transparent text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEditing
              ? (existingInvoice?.status === "quote" ? "Edit Quotation" : (existingInvoice?.transactionType === "CreditNote" ? "Edit Credit Note" : (existingInvoice?.transactionType === "DebitNote" ? "Edit Debit Note" : "Edit Invoice")))
              : (searchParams.get('type') === 'quote' ? "New Quotation" : "New Invoice")
            }
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={loadingAction !== null || isLockedByOther}
          >
            {loadingAction === 'draft' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            variant="outline"
            onClick={handleSaveQuotation}
            disabled={loadingAction !== null || isLockedByOther}
            className="hover:bg-slate-50"
          >
            {loadingAction === 'quote' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
            Save as Quotation
          </Button>
          <Button
            onClick={handleIssue}
            disabled={loadingAction !== null || isLockedByOther}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {loadingAction === 'issue' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Issue Invoice
          </Button>
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
                          lineTotal: (item.quantity * item.unitPrice).toString(),
                          product: { hsCode: item.hsCode }
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
                        ...company,
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
                            lineTotal: (item.quantity * item.unitPrice).toString(),
                            product: { hsCode: item.hsCode }
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
                          ...company,
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


        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <Card className="bg-white shadow-lg border-slate-200 p-8 md:p-12 min-h-[1100px] text-sm">
          {/* Header Row */}
          <div className="flex justify-between items-start mb-12 border-b border-slate-100 pb-8">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">
                {searchParams.get('type') === 'quote' || existingInvoice?.status === 'quote'
                  ? "OFFICIAL QUOTATION"
                  : (existingInvoice?.fiscalCode
                    ? (existingInvoice?.transactionType === "CreditNote" ? "FISCAL CREDIT NOTE" : (existingInvoice?.transactionType === "DebitNote" ? "FISCAL DEBIT NOTE" : "FISCAL TAX INVOICE"))
                    : (existingInvoice?.transactionType === "CreditNote" ? "CREDIT NOTE" : (existingInvoice?.transactionType === "DebitNote" ? "DEBIT NOTE" : "TAX INVOICE")))
                }
              </h2>
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
            </div>
          </div>

          {/* Invoice Details Header Row */}
          <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-100 mb-12">
            <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invoice No</Label>
                <div className="font-mono font-bold text-slate-700 bg-white/50 px-2 py-1 rounded border border-slate-100">
                  {isEditing && existingInvoice ? existingInvoice.invoiceNumber : "[Auto-Generated]"}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fiscal Day</Label>
                <div className="font-mono font-bold text-slate-700 bg-white/50 px-2 py-1 rounded border border-slate-100">
                  {isEditing && existingInvoice ? (existingInvoice.fiscalDayNo || "-") : "[Auto-Generated]"}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="h-9 py-0 px-3 w-40 bg-white border-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-9 py-0 px-3 w-40 bg-white border-slate-200"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Currency</Label>
                <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="h-9 py-0 px-3 w-32 bg-white border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies?.map(c => (
                      <SelectItem key={c.id} value={c.code}>{c.code} ({c.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-9 py-0 px-3 w-44 bg-white border-slate-200">
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

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fiscal Device ID</Label>
                <div className="text-slate-900 font-mono font-medium pt-1">
                  {company?.fdmsDeviceId || "Not Registered"}
                </div>
                <div className="text-[9px] text-slate-400 leading-none">
                  Verification code generated on submission
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12 mb-12">
            {/* Seller Details */}
            <div className="space-y-4">
              <div className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Seller</div>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {company?.logoUrl && (
                  <div className="flex-shrink-0">
                    <img
                      src={company.logoUrl}
                      alt="Company Logo"
                      className="h-16 w-32 object-contain"
                      onError={(e) => {
                        console.error("Logo load error:", e);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-900">{company?.tradingName || company?.name || "Company Name"}</h3>
                  <div className="text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 mt-2 text-sm">
                    <p>TIN: <span className="font-mono text-slate-900">{company?.tin || "-"}</span></p>
                    <p>VAT No: <span className="font-mono text-slate-900">{company?.vatNumber || "-"}</span></p>
                    <p>{company?.address || "Address Line 1"}, {company?.city}</p>
                    <p>{company?.email} | {company?.phone}</p>
                  </div>
                </div>
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
                          <CommandInput
                            placeholder="Search customer..."
                            value={customerSearch}
                            onValueChange={setCustomerSearch}
                          />
                          <CommandList>
                            <CommandEmpty className="p-0">
                              <div className="p-4 text-sm text-center text-slate-500">
                                No customer found.
                              </div>
                              {customerSearch.trim() && (
                                <div className="p-1 border-t">
                                  <Button
                                    variant="ghost"
                                    className="w-full justify-start h-9 text-xs font-medium text-primary hover:text-primary hover:bg-primary/5"
                                    onClick={async () => {
                                      try {
                                        const newC = await createCustomer.mutateAsync({
                                          name: customerSearch,
                                          customerType: "individual"
                                        });
                                        setCustomerId(newC.id.toString());
                                        setCustomerSearch("");
                                        setOpen(false);
                                        toast({ title: "Customer Added", description: `${newC.name} has been created.` });
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }}
                                  >
                                    <Plus className="w-3 h-3 mr-2" /> Add "{customerSearch}" as new customer
                                  </Button>
                                </div>
                              )}
                            </CommandEmpty>
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
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-slate-100">
                  <TableRow className="hover:bg-slate-50">
                    <TableHead className="w-[240px] pl-4">Item (Search Name/Code)</TableHead>
                    <TableHead className="min-w-[150px]">Description</TableHead>
                    <TableHead className="w-[100px] text-center">Qty</TableHead>
                    <TableHead className="w-[140px] text-right">Unit Price {taxInclusive ? '(Incl)' : '(Excl)'}</TableHead>
                    <TableHead className="w-[80px] text-center">Tax %</TableHead>
                    <TableHead className="w-[120px] text-right">Total (Incl)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {items.map((item, index) => {
                      const lineVal = item.quantity * item.unitPrice;
                      let vatAmt = 0;
                      let totalAmt = 0;

                      if (taxInclusive) {
                        totalAmt = lineVal;
                      } else {
                        vatAmt = lineVal * (item.taxRate / 100);
                        totalAmt = lineVal + vatAmt;
                      }

                      return (
                        <motion.tr
                          key={item.localId}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="group hover:bg-slate-50/30 transition-colors border-b border-slate-50"
                        >
                          <TableCell className="align-middle pl-4 py-3">
                            <Popover
                              open={openRowIndex === index}
                              onOpenChange={(isOpen) => setOpenRowIndex(isOpen ? index : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between bg-white h-9 px-3 font-normal overflow-hidden",
                                    !item.productId && "text-muted-foreground"
                                  )}
                                >
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    {item.hsCode && (
                                      <Badge variant="secondary" className="text-[9px] h-4 py-0 px-1 font-mono opacity-60">
                                        {item.hsCode}
                                      </Badge>
                                    )}
                                    <span className="truncate">
                                      {item.productId
                                        ? products?.find((p) => p.id === item.productId)?.name || "Select Item"
                                        : "Select Item"}
                                    </span>
                                  </div>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput
                                    placeholder="Search items..."
                                    value={productSearch[item.localId] || ""}
                                    onValueChange={(val) => setProductSearch(prev => ({ ...prev, [item.localId]: val }))}
                                  />
                                  <CommandList>
                                    <CommandEmpty className="p-0">
                                      <div className="p-4 text-sm text-center text-slate-500">
                                        No item found.
                                      </div>
                                      {productSearch[item.localId]?.trim() && (
                                        <div className="p-1 border-t">
                                          <Button
                                            variant="ghost"
                                            className="w-full justify-start h-9 text-xs font-medium text-primary hover:text-primary hover:bg-primary/5"
                                            onClick={async () => {
                                              try {
                                                const newP = await createProduct.mutateAsync({
                                                  name: productSearch[item.localId],
                                                  price: "0",
                                                  taxRate: "15",
                                                  productType: "good",
                                                  sku: `AUTO-${Date.now().toString().slice(-4)}`
                                                });
                                                handleProductSelect(item.localId, newP.id.toString());
                                                setProductSearch(prev => {
                                                  const next = { ...prev };
                                                  delete next[item.localId];
                                                  return next;
                                                });
                                                setOpenRowIndex(null);
                                                toast({ title: "Product Added", description: `${newP.name} has been created.` });
                                              } catch (e) {
                                                console.error(e);
                                              }
                                            }}
                                          >
                                            <Plus className="w-3 h-3 mr-2" /> Add "{productSearch[item.localId]}" as new product
                                          </Button>
                                        </div>
                                      )}
                                    </CommandEmpty>
                                    <CommandGroup heading="Products">
                                      {products?.filter(p => !p.productType || p.productType === 'good').map((product) => (
                                        <CommandItem
                                          key={product.id}
                                          value={`product ${product.name} ${product.sku || ""}`}
                                          onSelect={() => {
                                            handleProductSelect(item.localId, product.id.toString());
                                            setOpenRowIndex(null);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              item.productId === product.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <div className="flex flex-col flex-1">
                                            <span className="font-medium text-sm">{product.name}</span>
                                            <div className="flex justify-between w-full text-xs text-muted-foreground mt-0.5">
                                              <span>{product.sku}</span>
                                              <span className="font-mono">${Number(product.price).toFixed(2)}</span>
                                            </div>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                    <CommandGroup heading="Services">
                                      {products?.filter(p => p.productType === 'service').map((service) => (
                                        <CommandItem
                                          key={service.id}
                                          value={`service ${service.name} ${service.sku || ""}`}
                                          onSelect={() => {
                                            handleProductSelect(item.localId, service.id.toString());
                                            setOpenRowIndex(null);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              item.productId === service.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          <div className="flex flex-col flex-1">
                                            <span className="font-medium text-sm">{service.name}</span>
                                            <div className="flex justify-between w-full text-xs text-muted-foreground mt-0.5">
                                              <span>{service.sku || 'Service'}</span>
                                              <span className="font-mono">${Number(service.price).toFixed(2)}</span>
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
                          <TableCell className="align-middle py-3">
                            <Input
                              placeholder="Description..."
                              value={item.description}
                              onChange={(e) => updateItem(item.localId, 'description', e.target.value)}
                              className="bg-transparent border-transparent hover:border-slate-200 focus:border-primary focus:bg-white h-9 px-2 text-sm transition-all"
                            />
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.localId, 'quantity', parseFloat(e.target.value) || 0)}
                              className="bg-transparent border-transparent hover:border-slate-200 focus:border-primary focus:bg-white h-9 px-2 text-center text-sm font-medium w-full transition-all"
                            />
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={Number(item.unitPrice)}
                              onChange={(e) => updateItem(item.localId, 'unitPrice', parseFloat(e.target.value) || 0)}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                updateItem(item.localId, 'unitPrice', parseFloat(val.toFixed(2)));
                              }}
                              className="bg-transparent border-transparent hover:border-slate-200 focus:border-primary focus:bg-white h-9 px-2 text-right text-sm font-mono w-full transition-all"
                            />
                          </TableCell>
                          <TableCell className="align-middle text-center py-3">
                            <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              {item.taxRate}%
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold font-mono text-slate-900 align-middle py-3 pr-4">
                            {totalAmt.toFixed(2)}
                          </TableCell>
                          <TableCell className="align-middle py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleRemoveItem(item.localId)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
              <div className="p-2 border-t border-slate-100 bg-slate-50/30">
                <Button variant="ghost" size="sm" onClick={handleAddItem} className="text-primary hover:text-primary hover:bg-primary/5 w-full justify-start h-8">
                  <Plus className="w-3.5 h-3.5 mr-2" /> Add Line Item
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
            {/* Left Column: Notes & Banking */}
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase text-slate-400">Notes</Label>
                  {(existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote") && (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Required for CN/DN</span>
                  )}
                </div>
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

                {Object.entries(taxBreakdown).map(([rate, vals]) => (
                  <div key={rate} className="flex justify-between text-[11px] text-slate-500 pl-4 border-l-2 border-slate-200">
                    <span>VAT {rate}%</span>
                    <span className="font-mono">{currentSymbol}{vals.tax.toFixed(2)}</span>
                  </div>
                ))}

                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Total Tax</span>
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
                  <div className="text-xs text-slate-500">Verify at <span className="text-primary underline">{company?.qrUrl || "https://receipt.zimra.org/"}</span></div>
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
