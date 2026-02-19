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
import { Plus, Trash2, Loader2, ArrowLeft, Check, ChevronsUpDown, ShieldCheck, Send, Lock, ClipboardList, AlertCircle } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
  taxTypeId?: number | null;
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
  const { taxTypes } = useTaxConfig(companyId);
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
          hsCode: (item as any).product?.hsCode || undefined,
          taxTypeId: item.taxTypeId
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

  // Helper to get default tax rate based on company registration
  const getDefaultTaxRate = () => {
    if (company && !company.vatRegistered) return 0;
    return 15;
  };

  const [items, setItems] = useState<LineItem[]>([
    { localId: Math.random().toString(36).substring(2, 11), productId: null, description: "", quantity: 1, unitPrice: 0, taxRate: getDefaultTaxRate() }
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
    setItems([...items, { localId: Math.random().toString(36).substring(2, 11), productId: null, description: "", quantity: 1, unitPrice: 0, taxRate: getDefaultTaxRate() }]);
  };

  const handleRemoveItem = (localId: string) => {
    setItems(items.filter(item => item.localId !== localId));
  };

  const handleProductSelect = (localId: string, productId: string) => {
    const product = products?.find(p => p.id === parseInt(productId));
    if (product) {
      setItems(prev => prev.map(item => {
        if (item.localId !== localId) return item;

        // Determine tax rate: prefer taxCategoryId if linked, otherwise fallback to product override
        let taxRate = company?.vatRegistered ? Number(product.taxRate ?? 15) : 0;

        if (company?.vatRegistered && product.taxCategoryId && taxTypes.data) {
          // Find the tax category, which should contain the rate or link to the type
          const category = taxTypes.data.find(t => t.id === product.taxCategoryId);
          if (category) {
            taxRate = Number(category.rate);
          }
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
          hsCode: product.hsCode || "0000",
          taxTypeId: product.taxTypeId
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
    const breakdown: Record<string, { net: number, tax: number, rate: number, taxTypeId: number }> = {};

    items.forEach(item => {
      const lineTotal = item.quantity * item.unitPrice;
      const rate = Number(item.taxRate);
      const taxTypeId = item.taxTypeId || 0;
      const key = `${rate}-${taxTypeId}`;

      if (!breakdown[key]) breakdown[key] = { net: 0, tax: 0, rate, taxTypeId };

      if (taxInclusive) {
        const taxPortion = lineTotal - (lineTotal / (1 + (rate / 100)));
        breakdown[key].net += (lineTotal - taxPortion);
        breakdown[key].tax += taxPortion;
      } else {
        const taxPortion = lineTotal * (rate / 100);
        breakdown[key].net += lineTotal;
        breakdown[key].tax += taxPortion;
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
          lineTotal: rawLineTotal.toString(),
          taxTypeId: item.taxTypeId
        };
      })
    };

    // Credit Note / Debit Note: A reason is required by ZIMRA.
    const isCnDn = existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote";
    if (isCnDn && !notes?.trim()) {
      console.log("No notes provided for CN/DN draft, using system default.");
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
          lineTotal: rawLineTotal.toString(),
          taxTypeId: item.taxTypeId
        };
      })
    };

    // Credit Note / Debit Note: A reason is required by ZIMRA.
    const isCnDn = existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote";
    if (isCnDn && !notes?.trim()) {
      console.log("No notes provided for CN/DN quotation, using system default.");
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

    // Validate Issue Date & Fix Time
    let finalIssueDate = new Date();
    if (!issueDate || isNaN(new Date(issueDate).getTime())) {
      toast({
        title: "Validation Error",
        description: "Please select a valid issue date.",
        variant: "destructive",
      });
      setLoadingAction(null);
      return;
    } else {
      const selectedDate = new Date(issueDate);
      const today = new Date();
      if (selectedDate.toISOString().slice(0, 10) === today.toISOString().slice(0, 10)) {
        finalIssueDate = new Date();
      } else {
        finalIssueDate = new Date(issueDate);
      }
    }

    if (company?.fiscalDayOpenedAt) {
      const fiscalDayOpen = new Date(company.fiscalDayOpenedAt);
      if (finalIssueDate < fiscalDayOpen) {
        toast({ title: "Validation Error", description: `Invoice Date cannot be earlier than Fiscal Day Opening Time (${fiscalDayOpen.toLocaleString()}).`, variant: "destructive" });
        setLoadingAction(null);
        return;
      }
    }

    if (company?.lastReceiptAt) {
      const lastReceipt = new Date(company.lastReceiptAt);
      if (finalIssueDate < lastReceipt) {
        toast({ title: "Validation Error", description: `Invoice Date cannot be earlier than the last receipt (${lastReceipt.toLocaleString()}). Sequence must be maintained.`, variant: "destructive" });
        setLoadingAction(null);
        return;
      }
    }

    // No Future Dates (RCPT031)
    if (finalIssueDate > new Date()) {
      toast({ title: "Validation Error", description: "Invoice Date cannot be in the future (RCPT031).", variant: "destructive" });
      setLoadingAction(null);
      return;
    }


    const invoiceNumber = isEditing && existingInvoice && existingInvoice.status === 'issued'
      ? existingInvoice.invoiceNumber
      : `INV-${Date.now().toString().slice(-6)}`;

    // Credit Note / Debit Note Check (Moved up for item mapping)
    const isCnDn = existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote";

    // Common data payload
    const invoiceData = {
      companyId,
      invoiceNumber,
      customerId: parseInt(customerId),
      issueDate: finalIssueDate,
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
          description: (!isCnDn && item.unitPrice < 0 && !item.description.toLowerCase().startsWith('discount')) ? `Discount: ${item.description}` : item.description,
          quantity: item.quantity.toString(),
          unitPrice: item.unitPrice.toString(),
          taxRate: item.taxRate.toString(),
          lineTotal: rawLineTotal.toString(),
          taxTypeId: item.taxTypeId
        };
      })
    };

    // Credit Note / Debit Note: A reason is required by ZIMRA.
    if (isCnDn && !notes?.trim()) {
      toast({
        title: "Default Reason Used",
        description: `No reason was provided. A default reason ("Correction of data entry error") will be used for this ${existingInvoice?.transactionType === "CreditNote" ? "Credit Note" : "Debit Note"}.`,
      });
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

  // Validation State
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'draft' | 'issue' | 'quote' | null>(null);

  const validateInvoice = (action: 'draft' | 'issue' | 'quote'): string[] => {
    const warnings: string[] = [];

    // 1. HS Code Validation (Critical for ZIMRA)
    const missingHsCodes = items.filter(item => !item.hsCode || item.hsCode.length < 4); // Minimal check
    if (missingHsCodes.length > 0) {
      warnings.push(`⚠️ ${missingHsCodes.length} item(s) are missing valid HS Codes. ZIMRA requires proper classification.`);
    }

    // 2. Zero Price Validation
    const zeroPriceItems = items.filter(item => item.unitPrice === 0 && !item.description.toLowerCase().includes('discount'));
    if (zeroPriceItems.length > 0) {
      warnings.push(`⚠️ ${zeroPriceItems.length} item(s) have a price of 0.00. Ensure this is intentional (e.g., free sample).`);
    }

    // 3. Customer Details for High Value (B2B Requirement)
    const totalValue = Number(total); // Assuming total is calculated
    if (totalValue > 1000 && customerId) { // Threshold example
      const selectedCustomer = customers?.find(c => c.id === parseInt(customerId));
      if (selectedCustomer && !selectedCustomer.vatNumber && !selectedCustomer.tin) {
        warnings.push(`⚠️ Large transaction (${currentSymbol}${totalValue.toFixed(2)}) for a customer without VAT/TIN. ZIMRA may require buyer details for high-value invoices.`);
      }
    }

    // 4. Payment Method
    if (action === 'issue' && !paymentMethod) {
      warnings.push(`⚠️ No payment method selected.`);
    }

    return warnings;
  };

  const handleActionClick = (action: 'draft' | 'issue' | 'quote') => {
    const warnings = validateInvoice(action);
    if (warnings.length > 0) {
      setValidationWarnings(warnings);
      setPendingAction(action);
      setShowValidationDialog(true);
    } else {
      executeAction(action);
    }
  };

  const executeAction = (action: 'draft' | 'issue' | 'quote') => {
    if (action === 'draft') handleSaveDraft();
    if (action === 'issue') handleIssue();
    if (action === 'quote') handleSaveQuotation();
    setShowValidationDialog(false);
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
      <div className="bg-slate-50/50 min-h-screen pb-20">
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
            <Button variant="ghost" onClick={() => setLocation("/invoices")} className="pl-0 hover:pl-0 hover:bg-transparent text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className="text-lg font-medium">Back</span>
            </Button>
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
              {isEditing
                ? (existingInvoice?.status === "quote" ? "Edit Quotation" : (existingInvoice?.transactionType === "CreditNote" ? "Edit Credit Note" : (existingInvoice?.transactionType === "DebitNote" ? "Edit Debit Note" : "Edit Invoice")))
                : (searchParams.get('type') === 'quote' ? "New Quotation" : "New Invoice")
              }
            </h1>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => handleActionClick('draft')}
              disabled={loadingAction !== null || isLockedByOther}
              className="rounded-xl border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all font-medium"
            >
              {loadingAction === 'draft' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2 text-slate-500" />}
              Save Draft
            </Button>
            <Button
              variant="outline"
              onClick={() => handleActionClick('quote')}
              disabled={loadingAction !== null || isLockedByOther}
              className="rounded-xl border-slate-200 shadow-sm hover:bg-slate-50 hover:text-slate-900 transition-all font-medium"
            >
              {loadingAction === 'quote' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2 text-blue-500" />}
              Save as Quotation
            </Button>
            <Button
              onClick={() => handleActionClick('issue')}
              disabled={loadingAction !== null || isLockedByOther}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 font-semibold px-6"
            >
              {loadingAction === 'issue' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Issue Invoice
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900"
              onClick={() => setIsPreviewOpen(true)}
              title="Preview PDF"
            >
              <Eye className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 rounded-[2rem] overflow-hidden">
            {/* Header Section */}
            <div className="bg-slate-50/50 border-b border-slate-100 px-8 md:px-12 py-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <svg width="200" height="200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 relative z-10">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", searchParams.get('type') === 'quote' ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600")}>
                      {searchParams.get('type') === 'quote' || existingInvoice?.status === 'quote' ? <ClipboardList className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                    </div>
                    <h1 className="text-3xl font-display font-black text-slate-900 tracking-tight uppercase">
                      {searchParams.get('type') === 'quote' || existingInvoice?.status === 'quote'
                        ? "Official Quotation"
                        : (existingInvoice?.fiscalCode
                          ? (existingInvoice?.transactionType === "CreditNote" ? "Fiscal Credit Note" : (existingInvoice?.transactionType === "DebitNote" ? "Fiscal Debit Note" : (company?.vatRegistered ? "Fiscal Tax Invoice" : "Fiscal Invoice")))
                          : (existingInvoice?.transactionType === "CreditNote" ? "Credit Note" : (existingInvoice?.transactionType === "DebitNote" ? "Debit Note" : "Tax Invoice")))
                      }
                    </h1>
                  </div>
                  <p className="text-slate-500 font-medium text-lg pl-1">Create and customize your document details below.</p>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-3">
                  <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
                    <Button
                      variant={taxInclusive ? "ghost" : "default"}
                      size="sm"
                      onClick={() => setTaxInclusive(false)}
                      className={cn("rounded-xl text-sm font-semibold px-4 py-2 transition-all", !taxInclusive ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100")}
                    >
                      Tax Exclusive
                    </Button>
                    <Button
                      variant={taxInclusive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setTaxInclusive(true)}
                      className={cn("rounded-xl text-sm font-semibold px-4 py-2 transition-all", taxInclusive ? "bg-slate-900 text-white shadow-md" : "text-slate-600 hover:bg-slate-100")}
                    >
                      Tax Inclusive
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="px-8 md:px-12 py-12 space-y-16">

              {/* Invoice Details Header */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-violet-100 transition-all duration-500">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-violet-500 to-indigo-500"></div>
                <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 font-bold text-sm">1</span>
                  Document Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Invoice No</Label>
                    <div className="font-mono font-bold text-slate-800 bg-slate-50/80 px-4 py-3 rounded-xl border border-slate-200/60 shadow-sm">
                      {isEditing && existingInvoice ? existingInvoice.invoiceNumber : <span className="text-slate-400 italic">Auto-Generated</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Fiscal Day</Label>
                    <div className="font-mono font-bold text-slate-800 bg-slate-50/80 px-4 py-3 rounded-xl border border-slate-200/60 shadow-sm">
                      {isEditing && existingInvoice ? (existingInvoice.fiscalDayNo || "-") : <span className="text-slate-400 italic">Auto-Generated</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Date</Label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="h-11 rounded-xl bg-white border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-11 rounded-xl bg-white border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Currency</Label>
                    <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                      <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl border-slate-100">
                        {currencies?.map(c => (
                          <SelectItem key={c.id} value={c.code} className="font-medium">{c.code} ({c.symbol})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl border-slate-100">
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CARD">Card / Swipe</SelectItem>
                        <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="ECOCASH">Ecocash / Mobile</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Fiscal Device ID</Label>
                    <div className="text-slate-900 font-mono font-semibold bg-slate-50/50 px-4 py-3 rounded-xl border border-slate-100 text-sm flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", company?.fdmsDeviceId ? "bg-emerald-500" : "bg-amber-500")}></div>
                      {company?.fdmsDeviceId || "Not Registered"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller & Buyer Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Seller Details */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-all duration-500">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-50 rounded-2xl">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Seller Details</h3>
                  </div>
                  <div className="flex gap-6 items-start">
                    {company?.logoUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={company.logoUrl}
                          alt="Company Logo"
                          className="h-20 w-32 object-contain rounded-xl border border-slate-100 bg-slate-50/50 p-2"
                          onError={(e) => {
                            console.error("Logo load error:", e);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <h4 className="text-xl font-bold text-slate-900">{company?.tradingName || company?.name || "Company Name"}</h4>
                      <div className="text-slate-600 space-y-2 text-sm font-medium">
                        <div className="grid grid-cols-2 gap-4">
                          <p><span className="text-slate-400 font-normal">TIN:</span> <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{company?.tin || "-"}</span></p>
                          <p><span className="text-slate-400 font-normal">VAT:</span> <span className="font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{company?.vatNumber || "-"}</span></p>
                        </div>
                        <p className="flex items-start gap-2"><span className="text-slate-400 font-normal min-w-[60px]">Address:</span> <span>{company?.address || "Address Line 1"}, {company?.city}</span></p>
                        <p className="flex items-start gap-2"><span className="text-slate-400 font-normal min-w-[60px]">Contact:</span> <span>{company?.email} {company?.phone && `| ${company?.phone}`}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buyer Details */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-100 transition-all duration-500">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-emerald-50 rounded-2xl">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Buyer Details</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Select Customer</Label>
                      <div className="flex gap-2">
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="flex-1 justify-between bg-white border-slate-200 h-12 rounded-xl text-base px-4 hover:bg-slate-50 hover:border-emerald-200 transition-all"
                            >
                              {customerId
                                ? customers?.find((customer) => customer.id.toString() === customerId)?.name
                                : <span className="text-slate-400 font-normal">Select a client or search...</span>}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0 rounded-xl shadow-xl border-slate-100" align="start">
                            <Command className="rounded-xl">
                              <CommandInput
                                placeholder="Search customer by name, TIN or email..."
                                value={customerSearch}
                                onValueChange={setCustomerSearch}
                                className="h-12 text-base"
                              />
                              <CommandList className="max-h-[300px]">
                                <CommandEmpty className="p-0">
                                  <div className="p-6 text-sm text-center text-slate-500 flex flex-col items-center gap-2">
                                    <div className="p-3 bg-slate-50 rounded-full mb-2">
                                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    </div>
                                    <span>No customer found.</span>
                                  </div>
                                  {customerSearch.trim() && (
                                    <div className="p-2 border-t border-slate-100 bg-slate-50">
                                      <Button
                                        variant="ghost"
                                        className="w-full justify-start h-10 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
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
                                        <Plus className="w-4 h-4 mr-2" /> Create "{customerSearch}"
                                      </Button>
                                    </div>
                                  )}
                                </CommandEmpty>
                                <CommandGroup>
                                  {customers?.map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={`${customer.name} ${customer.tin || ""} ${customer.email || ""}`}
                                      className="py-3 px-3 cursor-pointer aria-selected:bg-emerald-50"
                                      onSelect={() => {
                                        setCustomerId(customer.id.toString());
                                        setOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-3 h-4 w-4 text-emerald-600",
                                          customerId === customer.id.toString() ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-semibold text-slate-900">{customer.name}</span>
                                        {(customer.tin || customer.email) && (
                                          <span className="text-xs text-slate-500 flex items-center gap-2">
                                            {customer.tin && <span className="bg-slate-100 px-1.5 rounded font-mono">{customer.tin}</span>}
                                            {customer.email && <span>{customer.email}</span>}
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
                      </div>
                    </div>

                    {/* Selected Customer Details */}
                    {customerId && (() => {
                      const c = customers?.find(cust => cust.id.toString() === customerId);
                      if (!c) return null;
                      return (
                        <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100/50 transition-all animate-in fade-in slide-in-from-top-2">
                          <h4 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                            {c.name}
                            <Badge variant="outline" className="bg-white border-emerald-200 text-emerald-700 font-normal">Verified</Badge>
                          </h4>
                          <div className="text-slate-600 space-y-2 text-sm font-medium">
                            <div className="grid grid-cols-2 gap-4">
                              <p><span className="text-slate-400 font-normal">TIN:</span> <span className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-emerald-100">{c.tin || "-"}</span></p>
                              <p><span className="text-slate-400 font-normal">VAT:</span> <span className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-emerald-100">{c.vatNumber || "-"}</span></p>
                            </div>
                            <p className="flex items-start gap-2"><span className="text-slate-400 font-normal min-w-[60px]">Address:</span> <span>{c.address || "No Address"}, {c.city}</span></p>
                            <p className="flex items-start gap-2"><span className="text-slate-400 font-normal min-w-[60px]">Contact:</span> <span>{c.email} {c.phone && `| ${c.phone}`}</span></p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Invoice Items Section */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-50 rounded-2xl">
                      <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Items & Services</h3>
                      <p className="text-sm text-slate-500 font-medium">Add products or services to this document</p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                      <TableRow className="hover:bg-slate-50/50 border-none">
                        <TableHead className="w-[300px] pl-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Item Details</TableHead>
                        <TableHead className="min-w-[200px] py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Description</TableHead>
                        <TableHead className="w-[100px] text-center py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Qty</TableHead>
                        <TableHead className="w-[160px] text-right py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                          <div>Unit Price</div>
                          <div className="text-[9px] lowercase font-normal text-slate-400 no-underline opacity-75">{taxInclusive ? '(Incl. Tax)' : '(Excl. Tax)'}</div>
                        </TableHead>
                        <TableHead className="w-[160px] text-right py-4 text-xs font-bold uppercase tracking-wider text-slate-500 pr-6">Total</TableHead>
                        <TableHead className="w-[50px] py-4"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode="popLayout">
                        {items.length === 0 && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <TableCell colSpan={6} className="h-48 text-center text-slate-400 border-none">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="p-3 bg-slate-50 rounded-full">
                                  <ClipboardList className="w-6 h-6 opacity-20" />
                                </div>
                                <p>No items added yet</p>
                              </div>
                            </TableCell>
                          </motion.tr>
                        )}
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
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-none"
                            >
                              <TableCell className="align-top pl-6 py-4">
                                <Popover
                                  open={openRowIndex === index}
                                  onOpenChange={(isOpen) => setOpenRowIndex(isOpen ? index : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between bg-white h-11 px-3.5 font-normal rounded-xl border-slate-200 hover:border-violet-300 hover:ring-2 hover:ring-violet-100 transition-all text-left",
                                        !item.productId && "text-muted-foreground"
                                      )}
                                    >
                                      <div className="flex items-center gap-2 overflow-hidden w-full">
                                        {item.hsCode && (
                                          <Badge variant="secondary" className="text-[10px] h-5 py-0 px-1.5 font-mono bg-slate-100 text-slate-600 border-slate-200">
                                            {item.hsCode}
                                          </Badge>
                                        )}
                                        <span className="truncate flex-1">
                                          {item.productId
                                            ? products?.find((p) => p.id === item.productId)?.name || "Select Item"
                                            : "Select Item"}
                                        </span>
                                      </div>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-30" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[400px] p-0 rounded-xl shadow-xl border-slate-100" align="start">
                                    <Command className="rounded-xl">
                                      <CommandInput
                                        placeholder="Search products or services..."
                                        value={productSearch[item.localId] || ""}
                                        onValueChange={(val) => setProductSearch(prev => ({ ...prev, [item.localId]: val }))}
                                        className="h-12 text-base"
                                      />
                                      <CommandList className="max-h-[300px]">
                                        <CommandEmpty className="p-0">
                                          <div className="p-6 text-sm text-center text-slate-500 flex flex-col items-center gap-2">
                                            <span>No item found.</span>
                                          </div>
                                          {productSearch[item.localId]?.trim() && (
                                            <div className="p-2 border-t border-slate-100 bg-slate-50">
                                              <Button
                                                variant="ghost"
                                                className="w-full justify-start h-10 text-sm font-medium text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg"
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
                                                <Plus className="w-4 h-4 mr-2" /> Add "{productSearch[item.localId]}"
                                              </Button>
                                            </div>
                                          )}
                                        </CommandEmpty>
                                        <CommandGroup heading="Products">
                                          {products?.filter(p => !p.productType || p.productType === 'good').map((product) => (
                                            <CommandItem
                                              key={product.id}
                                              value={`product ${product.name} ${product.sku || ""}`}
                                              className="py-3 px-3 cursor-pointer aria-selected:bg-violet-50"
                                              onSelect={() => {
                                                handleProductSelect(item.localId, product.id.toString());
                                                setOpenRowIndex(null);
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-3 h-4 w-4 text-violet-600",
                                                  item.productId === product.id ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              <div className="flex flex-col flex-1 gap-0.5">
                                                <span className="font-semibold text-slate-900">{product.name}</span>
                                                <div className="flex justify-between w-full text-xs text-slate-500">
                                                  <span>{product.sku}</span>
                                                  <span className="font-mono font-medium text-slate-700">${Number(product.price).toFixed(2)}</span>
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
                                              className="py-3 px-3 cursor-pointer aria-selected:bg-violet-50"
                                              onSelect={() => {
                                                handleProductSelect(item.localId, service.id.toString());
                                                setOpenRowIndex(null);
                                              }}
                                            >
                                              <Check
                                                className={cn(
                                                  "mr-3 h-4 w-4 text-violet-600",
                                                  item.productId === service.id ? "opacity-100" : "opacity-0"
                                                )}
                                              />
                                              <div className="flex flex-col flex-1 gap-0.5">
                                                <span className="font-semibold text-slate-900">{service.name}</span>
                                                <div className="flex justify-between w-full text-xs text-slate-500">
                                                  <span>{service.sku || 'Service'}</span>
                                                  <span className="font-mono font-medium text-slate-700">${Number(service.price).toFixed(2)}</span>
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
                              <TableCell className="align-top py-4">
                                <Input
                                  placeholder="Description..."
                                  value={item.description}
                                  onChange={(e) => updateItem(item.localId, 'description', e.target.value)}
                                  className="bg-slate-50/50 border-transparent hover:border-slate-200 hover:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-white h-11 px-3 text-sm transition-all rounded-xl shadow-sm"
                                />
                              </TableCell>
                              <TableCell className="align-top py-4">
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(item.localId, 'quantity', parseFloat(e.target.value) || 0)}
                                  className="bg-slate-50/50 border-transparent hover:border-slate-200 hover:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-white h-11 px-2 text-center text-sm font-bold text-slate-700 w-full transition-all rounded-xl shadow-sm"
                                />
                              </TableCell>
                              <TableCell className="align-top py-4">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={Number(item.unitPrice)}
                                  onChange={(e) => updateItem(item.localId, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  onBlur={(e) => {
                                    // Allow negative values for discounts
                                    const val = parseFloat(e.target.value) || 0;
                                    updateItem(item.localId, 'unitPrice', parseFloat(val.toFixed(2)));
                                  }}
                                  className="bg-slate-50/50 border-transparent hover:border-slate-200 hover:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 focus:bg-white h-11 px-3 text-right text-sm font-mono font-medium text-slate-700 w-full transition-all rounded-xl shadow-sm"
                                />
                              </TableCell>
                              <TableCell className="text-right font-bold font-mono text-slate-900 align-middle py-4 pr-6 text-base">
                                {totalAmt.toFixed(2)}
                              </TableCell>
                              <TableCell className="align-middle py-4">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                  onClick={() => handleRemoveItem(item.localId)}
                                >
                                  <Trash2 className="w-5 h-5" />
                                </Button>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                  <div className="p-3 border-t border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <Button variant="ghost" size="sm" onClick={handleAddItem} className="text-violet-600 hover:text-violet-700 hover:bg-violet-100/50 w-full justify-center h-10 rounded-xl font-medium border border-dashed border-violet-200 hover:border-violet-300">
                      <Plus className="w-4 h-4 mr-2" /> Add Line Item
                    </Button>
                  </div>
                </div>
              </div>

              {/* Notes & Banking Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Notes Section */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-amber-100 transition-all duration-500">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-amber-50 rounded-2xl">
                      <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-900">Notes & Terms</h3>
                      <p className="text-sm text-slate-500 font-medium mb-1">Additional information for the customer</p>
                      {(existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote") && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg w-fit mt-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Required for CN/DN</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Enter invoice notes, terms and conditions, payment instructions, etc..."
                    className="bg-slate-50 min-h-[160px] resize-none text-sm rounded-2xl border-slate-200 focus:border-amber-400 focus:ring-amber-400/20"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                {/* Banking Details Section */}
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-100 transition-all duration-500">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-emerald-50 rounded-2xl">
                      <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Banking Details</h3>
                      <p className="text-sm text-slate-500 font-medium">Payment collection information</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Bank Name</Label>
                        <Input
                          placeholder="e.g. Stanbic, CBZ"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          className="bg-slate-50/50 border-slate-200 h-11 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Account Name</Label>
                        <Input
                          placeholder="Beneficiary Name"
                          value={accountName}
                          onChange={e => setAccountName(e.target.value)}
                          className="bg-slate-50/50 border-slate-200 h-11 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Account Number</Label>
                        <Input
                          placeholder="Account Number"
                          value={accountNumber}
                          onChange={e => setAccountNumber(e.target.value)}
                          className="bg-slate-50/50 border-slate-200 h-11 rounded-xl font-mono focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 pl-1">Branch Code</Label>
                        <Input
                          placeholder="Sort Code"
                          value={branchCode}
                          onChange={e => setBranchCode(e.target.value)}
                          className="bg-slate-50/50 border-slate-200 h-11 rounded-xl focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals & Verification Section */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <ShieldCheck className="w-32 h-32" />
                </div>

                <div className="flex flex-col lg:flex-row gap-12">
                  <div className="flex-1 space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-50 rounded-2xl">
                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">Summary & Verification</h3>
                        <p className="text-sm text-slate-500 font-medium">Final calculation and compliance check</p>
                      </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                      <div className="flex items-start gap-4">
                        <div className="bg-white border-2 border-slate-200 rounded-xl h-20 w-20 flex items-center justify-center text-xs font-mono text-slate-300 text-center p-2 flex-shrink-0 shadow-sm">
                          <div className="space-y-1">
                            <div className="w-8 h-8 mx-auto bg-slate-100 rounded-lg"></div>
                            <span>QR</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="font-bold text-slate-800">Digital Verification</p>
                          <p className="text-sm text-slate-500 leading-relaxed max-w-sm">
                            A unique QR code and fiscal signature will be automatically generated upon submission to ZIMRA for compliance.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 lg:max-w-md">
                    <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-100">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-600 font-medium">{!taxInclusive ? "Subtotal (excl. tax)" : "Subtotal"}</span>
                        <span className="font-mono font-bold text-slate-900 text-lg">{currentSymbol}{subtotal.toFixed(2)}</span>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Tax Breakdown</h4>
                        <div className="space-y-3">
                          {Object.entries(taxBreakdown).length > 0 ? Object.entries(taxBreakdown).map(([key, vals]) => {
                            const mTax = taxTypes.data?.find((t: any) => t.id == vals.taxTypeId);
                            // Strict check for Exempt first
                            const isExempt = mTax?.zimraTaxId == "1" || mTax?.zimraCode === 'C' || mTax?.zimraCode === 'E' || mTax?.name?.toLowerCase().includes('exempt');

                            return (
                              <div key={key} className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", isExempt ? "bg-slate-300" : "bg-indigo-500")}></div>
                                  <span className="text-slate-600 font-medium">
                                    {isExempt ? (mTax?.name || "Exempt") : `VAT (${Number(vals.rate).toFixed(1)}%)`}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-slate-700">
                                  {isExempt ? "-" : `${currentSymbol}${vals.tax.toFixed(2)}`}
                                </span>
                              </div>
                            );
                          }) : <div className="text-xs text-slate-400 italic text-center py-2">No tax applicable</div>}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-600 font-bold">Total Tax</span>
                        <span className="font-mono font-bold text-slate-800">{currentSymbol}{taxAmount.toFixed(2)}</span>
                      </div>

                      <div className="pt-4 border-t border-slate-200">
                        <div className="flex justify-between items-end bg-slate-900 p-6 rounded-xl shadow-lg shadow-slate-200 text-white relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full blur-2xl -mr-4 -mt-4"></div>
                          <span className="text-lg font-medium text-slate-300 relative z-10">Grand Total</span>
                          <span className="text-3xl font-mono font-bold tracking-tight relative z-10">{currentSymbol}{total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Validation Warning Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl border-0 shadow-2xl p-6">
          <DialogHeader className="mb-4">
            <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center text-xl font-bold text-slate-800">
              Validation Warnings
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 text-center mt-1">
              Please review the following potential issues before proceeding
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
            {validationWarnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-3 text-sm text-amber-700">
                <span className="mt-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full flex-shrink-0"></span>
                <span className="leading-relaxed font-medium">{warning.replace('⚠️ ', '')}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowValidationDialog(false)} className="flex-1 rounded-xl h-11 border-slate-200 hover:bg-slate-50 font-medium text-slate-700">
              Back to Edit
            </Button>
            <Button
              className="flex-1 rounded-xl h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold shadow-lg shadow-amber-200"
              onClick={() => pendingAction && executeAction(pendingAction)}
            >
              Proceed Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[92vh] p-0 rounded-3xl overflow-hidden border-0 shadow-2xl flex flex-col bg-slate-50">
          <div className="px-6 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 z-10">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-violet-100/50 rounded-xl">
                <Eye className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">Document Preview</DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500">Live preview of your generated document</DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 mr-2">
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", customerId ? "bg-emerald-500" : "bg-slate-300")}></div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Customer</span>
                </div>
                <div className="w-px h-3 bg-slate-200 mx-1"></div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", company ? "bg-emerald-500" : "bg-slate-300")}></div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Company</span>
                </div>
                <div className="w-px h-3 bg-slate-200 mx-1"></div>
                <div className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", items.length > 0 ? "bg-emerald-500" : "bg-slate-300")}></div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Items: {items.length}</span>
                </div>
              </div>

              <Button variant="ghost" onClick={() => setIsPreviewOpen(false)} className="h-9 w-9 p-0 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-slate-100/50 overflow-hidden relative">
            {customerId && company && items.length > 0 ? (
              <div className="w-full h-full p-4 lg:p-8 flex justify-center overflow-auto custom-scrollbar">
                <div className="shadow-2xl shadow-slate-300/50 rounded-sm overflow-hidden bg-white w-full max-w-[800px] h-fit min-h-full">
                  <PDFViewer width="100%" height="100%" className="w-full h-[800px] lg:h-full min-h-[80vh] border-none">
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
                      taxTypes={taxTypes.data}
                    />
                  </PDFViewer>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-w-md w-full text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Preview Unavailable</h3>
                  <p className="text-slate-500 mb-6 text-sm leading-relaxed">Please ensure all required information is provided to generate the document preview.</p>

                  <div className="space-y-3">
                    {!customerId && (
                      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl text-red-700 text-sm font-medium">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div> Customer not selected
                      </div>
                    )}
                    {customerId && !company && (
                      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl text-red-700 text-sm font-medium">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div> Company details missing
                      </div>
                    )}
                    {items.length === 0 && (
                      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl text-red-700 text-sm font-medium">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div> No items added
                      </div>
                    )}
                  </div>

                  <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="mt-8 w-full rounded-xl h-11 border-slate-200">
                    Back to Editor
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-200 shrink-0 z-10 flex justify-end gap-3">
            {customerId && company && items.length > 0 && (
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('Testing PDF generation');
                  }}
                  className="hidden sm:flex rounded-xl h-11 border-slate-200 hover:bg-slate-50 font-medium text-slate-600"
                >
                  Test Console
                </Button>

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
                      taxTypes={taxTypes.data}
                    />
                  }
                  fileName={`Invoice-Draft-${Date.now()}.pdf`}
                  className="w-full sm:w-auto"
                >
                  {({ blob, url, loading, error }) => {
                    if (loading) {
                      return (
                        <Button disabled className="w-full rounded-xl h-11 bg-slate-100 text-slate-400 font-bold shadow-none">
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </Button>
                      );
                    }
                    return (
                      <Button className="w-full rounded-xl h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg shadow-slate-200">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    );
                  }}
                </PDFDownloadLink>
              </div>
            )}
            <Button variant="ghost" onClick={() => setIsPreviewOpen(false)} className="rounded-xl h-11 text-slate-500 hover:text-slate-800 font-medium hidden sm:flex">
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout >
  );
}
