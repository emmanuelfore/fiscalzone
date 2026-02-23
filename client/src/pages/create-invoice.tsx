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
      <div className="bg-slate-50/40 min-h-screen pb-32">
        {isLockedByOther && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-8 rounded-r-xl shadow-sm animate-in slide-in-from-top duration-300">
            <div className="flex">
              <div className="flex-shrink-0">
                <Lock className="h-5 w-5 text-amber-500" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-900 font-bold">
                  {lockStatus}
                  <span className="block mt-1 text-xs opacity-75 font-medium">You can view this invoice but cannot make changes.</span>
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="mb-6 flex items-center justify-between no-print pt-4">
          <Button variant="ghost" onClick={() => setLocation("/invoices")} className="px-3 hover:bg-white/50 text-slate-500 hover:text-slate-900 transition-all rounded-xl h-12">
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span className="text-sm font-black uppercase tracking-widest">Back to Matrix</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-white/50 text-slate-500 h-12 w-12 flex"
            onClick={() => setIsPreviewOpen(true)}
            title="Preview PDF"
          >
            <Eye className="w-5 h-5" />
          </Button>
        </div>

        <div className="max-w-7xl mx-auto px-0 md:px-0">
          <div className="bg-white shadow-3xl shadow-slate-200 border-none rounded-[2.5rem] overflow-hidden">
            {/* Header Section */}
            <div className="bg-slate-900 px-8 md:px-16 py-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[120px] -mr-32 -mt-32 rounded-full animate-pulse" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] -ml-32 -mb-32 rounded-full" />

              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-8 relative z-10">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={cn("p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner", searchParams.get('type') === 'quote' ? "text-blue-400" : "text-violet-400")}>
                      {searchParams.get('type') === 'quote' || existingInvoice?.status === 'quote' ? <ClipboardList className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                    </div>
                    <div>
                      <h1 className="text-4xl font-display font-black text-white tracking-tight uppercase leading-none">
                        {searchParams.get('type') === 'quote' || existingInvoice?.status === 'quote'
                          ? "Official Quotation"
                          : (existingInvoice?.fiscalCode
                            ? (existingInvoice?.transactionType === "CreditNote" ? "Fiscal Credit Note" : (existingInvoice?.transactionType === "DebitNote" ? "Fiscal Debit Note" : (company?.vatRegistered ? "Fiscal Tax Invoice" : "Fiscal Invoice")))
                            : (existingInvoice?.transactionType === "CreditNote" ? "Credit Note" : (existingInvoice?.transactionType === "DebitNote" ? "Debit Note" : "Tax Invoice")))
                        }
                      </h1>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="border-white/20 text-white/60 font-black uppercase tracking-widest text-[10px] bg-white/5 px-2 py-0.5">
                          Draft Mode
                        </Badge>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <p className="text-white/40 font-bold text-xs uppercase tracking-widest">Document ID: <span className="font-mono text-white/60">{isEditing && existingInvoice ? existingInvoice.invoiceNumber : 'NEW-INV'}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-6">
                  <div className="flex gap-3 w-full md:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => handleActionClick('draft')}
                      disabled={loadingAction !== null || isLockedByOther}
                      className="rounded-xl border-white/20 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest h-12 px-6"
                    >
                      {loadingAction === 'draft' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2 text-white/40" />}
                      Save Draft
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleActionClick('quote')}
                      disabled={loadingAction !== null || isLockedByOther}
                      className="rounded-xl border-white/20 bg-white/5 backdrop-blur-md text-white hover:bg-white/10 transition-all font-black text-[10px] uppercase tracking-widest h-12 px-6"
                    >
                      {loadingAction === 'quote' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2 text-blue-400" />}
                      Quotation
                    </Button>
                    <Button
                      onClick={() => handleActionClick('issue')}
                      disabled={loadingAction !== null || isLockedByOther}
                      className="btn-gradient rounded-xl shadow-2xl shadow-primary/20 transition-all font-black text-[10px] uppercase tracking-[0.2em] h-12 px-8"
                    >
                      {loadingAction === 'issue' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                      Issue & Fiscalize
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-inner">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTaxInclusive(false)}
                      className={cn("rounded-xl text-[10px] font-black uppercase tracking-widest px-5 h-10 transition-all", !taxInclusive ? "bg-white text-slate-900 shadow-xl" : "text-white/60 hover:text-white hover:bg-white/10")}
                    >
                      Exclusive
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTaxInclusive(true)}
                      className={cn("rounded-xl text-[10px] font-black uppercase tracking-widest px-5 h-10 transition-all", taxInclusive ? "bg-white text-slate-900 shadow-xl" : "text-white/60 hover:text-white hover:bg-white/10")}
                    >
                      Inclusive
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="px-8 md:px-16 py-12 space-y-16 bg-slate-50/30">

              {/* Invoice Details Header */}
              <div className="glass-card rounded-3xl p-8 border-none relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/20 transition-all group-hover:bg-primary group-hover:w-2" />
                <h3 className="text-xs font-black text-slate-400 mb-8 flex items-center gap-3 uppercase tracking-[0.2em]">
                  <span className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] shadow-lg">01</span>
                  Document Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Reference No</Label>
                    <div className="font-mono font-black text-primary bg-indigo-50/50 px-5 py-4 rounded-2xl border border-indigo-100/50 shadow-inner group-hover:scale-[1.02] transition-transform cursor-context-menu">
                      {isEditing && existingInvoice ? existingInvoice.invoiceNumber : <span className="text-slate-300 italic opacity-50">AUTO-GEN</span>}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Fiscal ID</Label>
                    <div className="font-mono font-black text-slate-900 bg-slate-100/50 px-5 py-4 rounded-2xl border border-slate-200/50 shadow-inner transition-all group-hover:bg-white text-sm">
                      {isEditing && existingInvoice ? (existingInvoice.fiscalDayNo || "-") : <span className="text-slate-300 italic opacity-50">STBY</span>}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Issue Timestamp</Label>
                    <Input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="h-14 rounded-2xl bg-white border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm uppercase tracking-tight shadow-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Expiry/Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="h-14 rounded-2xl bg-white border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black text-sm uppercase tracking-tight shadow-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Base Currency</Label>
                    <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                      <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black tracking-tight text-sm shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl border-slate-100 p-2">
                        {currencies?.map(c => (
                          <SelectItem key={c.id} value={c.code} className="font-bold rounded-xl py-3 px-4">{c.code} ({c.symbol})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Settlement Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-black tracking-tight text-sm shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl border-slate-100 p-2">
                        <SelectItem value="CASH" className="font-bold rounded-xl py-3 px-4">Cash Liquidity</SelectItem>
                        <SelectItem value="CARD" className="font-bold rounded-xl py-3 px-4">Digital Card</SelectItem>
                        <SelectItem value="TRANSFER" className="font-bold rounded-xl py-3 px-4">Swift Transfer</SelectItem>
                        <SelectItem value="ECOCASH" className="font-bold rounded-xl py-3 px-4">Mobile Money</SelectItem>
                        <SelectItem value="OTHER" className="font-bold rounded-xl py-3 px-4">Other Protocol</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5 lg:col-span-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Hardware Authorization</Label>
                    <div className="text-slate-900 font-mono font-black bg-slate-900 text-white/90 px-5 py-4 rounded-2xl border border-slate-800 text-xs flex items-center justify-between shadow-2xl">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]", company?.fdmsDeviceId ? "bg-emerald-400 shadow-emerald-400/50" : "bg-amber-400 shadow-amber-400/50")}></div>
                        <span className="tracking-widest uppercase opacity-60">Status: Registered</span>
                      </div>
                      <span className="font-mono text-[10px] text-white/40">{company?.fdmsDeviceId || "DEATHSTAR-UNMOD"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seller & Buyer Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Seller Details */}
                <div className="glass-card rounded-[2rem] p-10 border-none relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 -mr-16 -mt-16 rounded-full transition-transform group-hover:scale-150" />
                  <div className="flex items-center gap-5 mb-10">
                    <div className="p-4 bg-slate-900 rounded-2xl shadow-xl shadow-blue-500/10">
                      <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Primary Entity</h3>
                      <p className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">Seller Profile</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-8 items-start">
                    {company?.logoUrl && (
                      <div className="flex-shrink-0 group-hover:rotate-2 transition-transform">
                        <img
                          src={company.logoUrl}
                          alt="Company Logo"
                          className="h-28 w-44 object-contain rounded-3xl bg-white shadow-2xl shadow-slate-200/50 p-4 border border-slate-100"
                          onError={(e) => {
                            console.error("Logo load error:", e);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-5">
                      <h4 className="text-2xl font-display font-black text-slate-900 tracking-tighter uppercase leading-tight">{company?.tradingName || company?.name || "Company Name"}</h4>
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-4">
                          <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 shadow-inner">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-0.5">Tax Node</span>
                            <span className="font-mono font-black text-slate-900 text-sm tracking-tight">{company?.tin || "-"}</span>
                          </div>
                          <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 shadow-inner">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-0.5">VAT Registry</span>
                            <span className="font-mono font-black text-slate-900 text-sm tracking-tight">{company?.vatNumber || "-"}</span>
                          </div>
                        </div>
                        <div className="space-y-1.5 pt-2">
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                            <p className="text-sm font-bold text-slate-600 line-clamp-2 uppercase tracking-tight">{company?.address || "Address Line 1"}, {company?.city}</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                            <p className="text-sm font-bold text-slate-500 lowerecase">{company?.email} {company?.phone && `| ${company?.phone}`}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buyer Details */}
                <div className="glass-card rounded-[2rem] p-10 border-none relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 -mr-16 -mt-16 rounded-full transition-transform group-hover:scale-150" />
                  <div className="flex items-center gap-5 mb-10">
                    <div className="p-4 bg-slate-900 rounded-2xl shadow-xl shadow-emerald-500/10">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Counterparty</h3>
                      <p className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">Buyer Profile</p>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Target Entity Selection</Label>
                      <div className="relative">
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="w-full justify-between bg-white border-slate-200 h-16 rounded-2xl text-lg font-black px-6 hover:bg-slate-50 hover:border-emerald-300 hover:ring-4 hover:ring-emerald-500/5 transition-all text-slate-900 tracking-tight uppercase"
                            >
                              {customerId
                                ? customers?.find((customer) => customer.id.toString() === customerId)?.name
                                : <span className="text-slate-300 font-bold opacity-50">Initialize Customer Selection...</span>}
                              <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-20" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[450px] p-0 rounded-[2rem] shadow-3xl border-slate-100 overflow-hidden" align="start">
                            <Command className="rounded-none">
                              <CommandInput
                                placeholder="Query neural network for customer identity..."
                                value={customerSearch}
                                onValueChange={setCustomerSearch}
                                className="h-16 text-lg font-bold border-none"
                              />
                              <CommandList className="max-h-[400px] scrollbar-thin scrollbar-thumb-slate-200">
                                <CommandEmpty className="py-12 px-6 text-sm text-center text-slate-400 flex flex-col items-center gap-4">
                                  <div className="p-5 bg-slate-50 rounded-3xl">
                                    <Plus className="w-10 h-10 opacity-20" />
                                  </div>
                                  <span className="font-bold uppercase tracking-widest text-[10px]">No matches found in matrix</span>
                                  {customerSearch.trim() && (
                                    <Button
                                      onClick={async () => {
                                        try {
                                          const newC = await createCustomer.mutateAsync({
                                            name: customerSearch,
                                            customerType: "individual"
                                          });
                                          setCustomerId(newC.id.toString());
                                          setCustomerSearch("");
                                          setOpen(false);
                                          toast({ title: "Entity Created", description: `${newC.name} synced to registry.` });
                                        } catch (e) { console.error(e); }
                                      }}
                                      className="btn-gradient px-8 h-12 rounded-xl text-xs font-black uppercase tracking-widest"
                                    >
                                      Create "{customerSearch}"
                                    </Button>
                                  )}
                                </CommandEmpty>
                                <CommandGroup className="p-2">
                                  {customers?.map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={`${customer.name} ${customer.tin || ""} ${customer.email || ""}`}
                                      className="py-4 px-5 cursor-pointer aria-selected:bg-emerald-50 rounded-2xl transition-all"
                                      onSelect={() => {
                                        setCustomerId(customer.id.toString());
                                        setOpen(false);
                                      }}
                                    >
                                      <div className="flex items-center gap-4 w-full">
                                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shadow-inner", customerId === customer.id.toString() ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                                          {customer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col flex-1 gap-1">
                                          <span className="font-black text-slate-900 uppercase tracking-tight leading-none">{customer.name}</span>
                                          {(customer.tin || customer.email) && (
                                            <div className="flex items-center gap-3 text-[10px]">
                                              {customer.tin && <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-1.5 rounded">{customer.tin}</span>}
                                              {customer.email && <span className="font-bold text-slate-400">{customer.email}</span>}
                                            </div>
                                          )}
                                        </div>
                                        {customerId === customer.id.toString() && <Check className="w-5 h-5 text-emerald-500" />}
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
                        <div className="bg-emerald-500/5 rounded-3xl p-6 border border-emerald-500/10 transition-all animate-in zoom-in-95 duration-500 group/buyer hover:bg-emerald-500/10">
                          <div className="flex justify-between items-start mb-4">
                            <h4 className="text-xl font-display font-black text-slate-900 tracking-tight uppercase leading-none">{c.name}</h4>
                            <Badge className="bg-emerald-500 text-white border-none font-black text-[9px] uppercase tracking-[0.2em] px-2 py-0.5 shadow-lg shadow-emerald-500/20">Verified</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-6 pt-2">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">Registry ID</span>
                              <span className="font-mono font-black text-slate-900 text-sm tracking-tight bg-white px-2 py-1 rounded-lg border border-emerald-100/50 shadow-sm block w-fit">{c.tin || "UNREGISTERED"}</span>
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase block tracking-widest">VAT Protocol</span>
                              <span className="font-mono font-black text-slate-900 text-sm tracking-tight bg-white px-2 py-1 rounded-lg border border-emerald-100/50 shadow-sm block w-fit">{c.vatNumber || "NON-VAT"}</span>
                            </div>
                            <div className="col-span-2 pt-2 space-y-3">
                              <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm border border-emerald-100/50">
                                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                                <p className="text-xs font-black text-slate-600 uppercase tracking-tight pt-1.5">{c.address || "No Physical Coordinates Registered"}, {c.city}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Invoice Items Section */}
              <div className="glass-card rounded-[2rem] p-10 border-none overflow-hidden">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-5">
                    <div className="p-4 bg-slate-900 rounded-2xl shadow-xl shadow-violet-500/10">
                      <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Inventory manifest</h3>
                      <p className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">Line Items & Allocation</p>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white/50 backdrop-blur-sm shadow-2xl">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-900">
                        <TableRow className="hover:bg-slate-900 border-none">
                          <TableHead className="w-[350px] pl-8 py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Product / Service Description</TableHead>
                          <TableHead className="w-[120px] text-center py-5 text-[10px] font-black uppercase tracking-widest text-white/40">Quantity</TableHead>
                          <TableHead className="w-[180px] text-right py-5 text-[10px] font-black uppercase tracking-widest text-white/40">
                            Unit Cost <span className="opacity-30">({taxInclusive ? 'Gross' : 'Net'})</span>
                          </TableHead>
                          <TableHead className="w-[180px] text-right py-5 text-[10px] font-black uppercase tracking-widest text-white/40 pr-8">Ext. Amount</TableHead>
                          <TableHead className="w-[80px] py-5"></TableHead>
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
                              <TableCell colSpan={5} className="h-64 text-center text-slate-400 border-none">
                                <div className="flex flex-col items-center justify-center gap-4">
                                  <div className="p-6 bg-slate-50 rounded-[2rem]">
                                    <ClipboardList className="w-12 h-12 opacity-10" />
                                  </div>
                                  <p className="font-bold uppercase tracking-widest text-[10px]">Matrix empty: Initializing required</p>
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
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="group hover:bg-slate-50 transition-all border-b border-slate-50 last:border-none"
                              >
                                <TableCell className="align-top pl-8 py-6">
                                  <div className="space-y-3">
                                    <Popover
                                      open={openRowIndex === index}
                                      onOpenChange={(isOpen) => setOpenRowIndex(isOpen ? index : null)}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          variant="outline"
                                          role="combobox"
                                          className={cn(
                                            "w-full justify-between bg-white h-14 px-5 font-black uppercase tracking-tighter text-sm rounded-2xl border-slate-200 hover:border-violet-400 hover:ring-4 hover:ring-violet-500/5 transition-all text-left shadow-sm",
                                            !item.productId && "text-slate-300"
                                          )}
                                        >
                                          <div className="flex items-center gap-3 overflow-hidden w-full">
                                            {item.hsCode && (
                                              <Badge className="text-[9px] font-mono font-black bg-slate-900 text-white border-none py-0.5 px-2 tracking-widest leading-none">
                                                HS:{item.hsCode}
                                              </Badge>
                                            )}
                                            <span className="truncate flex-1">
                                              {item.productId
                                                ? products?.find((p) => p.id === item.productId)?.name || "Select Item Identity"
                                                : "Select Item Identity"}
                                            </span>
                                          </div>
                                          <ChevronsUpDown className="ml-2 h-5 w-5 shrink-0 opacity-10" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[450px] p-0 rounded-[2rem] shadow-3xl border-slate-100 overflow-hidden" align="start">
                                        <Command>
                                          <CommandInput
                                            placeholder="Querying item registries..."
                                            value={productSearch[item.localId] || ""}
                                            onValueChange={(val) => setProductSearch(prev => ({ ...prev, [item.localId]: val }))}
                                            className="h-16 text-lg font-bold"
                                          />
                                          <CommandList className="max-h-[400px]">
                                            <CommandEmpty className="p-10 text-center">
                                              <span className="font-black uppercase tracking-widest text-[10px] text-slate-400 block mb-4">No matching records found</span>
                                              {productSearch[item.localId]?.trim() && (
                                                <Button
                                                  onClick={async () => {
                                                    try {
                                                      const newP = await createProduct.mutateAsync({
                                                        name: productSearch[item.localId],
                                                        price: "0",
                                                        taxRate: "15",
                                                        productType: "good",
                                                        sku: `SKU-${Date.now().toString().slice(-4)}`
                                                      });
                                                      handleProductSelect(item.localId, newP.id.toString());
                                                      setProductSearch(prev => {
                                                        const next = { ...prev };
                                                        delete next[item.localId];
                                                        return next;
                                                      });
                                                      setOpenRowIndex(null);
                                                      toast({ title: "Registry Updated", description: `${newP.name} added to catalog.` });
                                                    } catch (e) { console.error(e); }
                                                  }}
                                                  className="btn-gradient px-8 h-12 rounded-xl text-xs font-black uppercase tracking-widest"
                                                >
                                                  Add "{productSearch[item.localId]}"
                                                </Button>
                                              )}
                                            </CommandEmpty>
                                            <CommandGroup heading="Material Goods" className="p-2">
                                              {products?.filter(p => !p.productType || p.productType === 'good').map((product) => (
                                                <CommandItem
                                                  key={product.id}
                                                  value={`product ${product.name} ${product.sku || ""}`}
                                                  className="py-4 px-5 cursor-pointer aria-selected:bg-violet-50 rounded-2xl"
                                                  onSelect={() => {
                                                    handleProductSelect(item.localId, product.id.toString());
                                                    setOpenRowIndex(null);
                                                  }}
                                                >
                                                  <div className="flex items-center gap-4 w-full">
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all shadow-inner", item.productId === product.id ? "bg-violet-500 text-white" : "bg-slate-100 text-slate-400")}>
                                                      {product.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col flex-1 gap-1">
                                                      <span className="font-black text-slate-900 uppercase tracking-tight leading-none">{product.name}</span>
                                                      <div className="flex justify-between items-center pr-2">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.sku}</span>
                                                        <span className="font-mono font-black text-violet-600">${Number(product.price).toFixed(2)}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                    <Input
                                      placeholder="Custom description overlay..."
                                      value={item.description}
                                      onChange={(e) => updateItem(item.localId, 'description', e.target.value)}
                                      className="bg-white border-slate-200 h-11 px-4 text-xs font-bold uppercase tracking-tight transition-all rounded-xl shadow-sm focus:ring-4 focus:ring-slate-100"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="align-top py-6">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(item.localId, 'quantity', parseFloat(e.target.value) || 0)}
                                    className="bg-white border-slate-200 h-14 px-2 text-center text-lg font-black text-slate-900 w-full transition-all rounded-2xl shadow-sm focus:ring-4 focus:ring-slate-100"
                                  />
                                </TableCell>
                                <TableCell className="align-top py-6">
                                  <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono font-black text-slate-300 text-sm">$</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={Number(item.unitPrice)}
                                      onChange={(e) => updateItem(item.localId, 'unitPrice', parseFloat(e.target.value) || 0)}
                                      onBlur={(e) => {
                                        const val = parseFloat(e.target.value) || 0;
                                        updateItem(item.localId, 'unitPrice', parseFloat(val.toFixed(2)));
                                      }}
                                      className="bg-white border-slate-200 h-14 pl-8 pr-4 text-right text-lg font-mono font-black text-slate-900 w-full transition-all rounded-2xl shadow-sm focus:ring-4 focus:ring-slate-100"
                                    />
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-black font-mono text-slate-900 align-top py-8 pr-8 text-xl tracking-tighter">
                                  {totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="align-top py-8">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
                  </div>
                  <div className="p-6 bg-slate-900/5 backdrop-blur-md">
                    <Button variant="ghost" size="lg" onClick={handleAddItem} className="bg-white hover:bg-slate-900 hover:text-white text-slate-900 w-full justify-center h-16 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] border-2 border-dashed border-slate-200 hover:border-slate-900 transition-all shadow-lg active:scale-95">
                      <Plus className="w-5 h-5 mr-3" /> Append Data Stream
                    </Button>
                  </div>
                </div>
              </div>

              {/* Notes & Banking Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Notes Section */}
                <div className="glass-card rounded-[2rem] p-10 border-none relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400 opacity-20 transition-all group-hover:opacity-100" />
                  <div className="flex items-start gap-5 mb-8">
                    <div className="p-4 bg-slate-900 rounded-2xl shadow-xl shadow-amber-500/10">
                      <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Extended Protocol</h3>
                      <p className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">Manual Notes & Conditions</p>
                      {(existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote") && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl w-fit mt-3 uppercase tracking-widest border border-amber-100">
                          <AlertCircle className="w-4 h-4" />
                          <span>Validation Required for CN/DN</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Append manual override notes, legal disclaimers, or specific settlement protocols..."
                    className="bg-white/50 backdrop-blur-sm min-h-[180px] resize-none text-sm font-bold rounded-2xl border-slate-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10 transition-all shadow-inner"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                {/* Banking Details Section */}
                <div className="glass-card rounded-[2rem] p-10 border-none relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-20 transition-all group-hover:opacity-100" />
                  <div className="flex items-start gap-5 mb-8">
                    <div className="p-4 bg-slate-900 rounded-2xl shadow-xl shadow-emerald-500/10">
                      <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="pt-1">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Fiat Settlement</h3>
                      <p className="text-xl font-display font-black text-slate-900 tracking-tight uppercase">Bank Wire Parameters</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Financial Institution</Label>
                      <Input
                        placeholder="e.g. CORE-BANK-A"
                        value={bankName}
                        onChange={e => setBankName(e.target.value)}
                        className="bg-white border-slate-200 h-14 rounded-2xl font-black uppercase tracking-tight text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Target Account Name</Label>
                      <Input
                        placeholder="ENTITY NAME"
                        value={accountName}
                        onChange={e => setAccountName(e.target.value)}
                        className="bg-white border-slate-200 h-14 rounded-2xl font-black uppercase tracking-tight text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Node/Account Number</Label>
                      <Input
                        placeholder="0000-0000-0000"
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value)}
                        className="bg-white border-slate-200 h-14 rounded-2xl font-mono font-black text-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-1">Gateway/Branch Code</Label>
                      <Input
                        placeholder="ROUTE-001"
                        value={branchCode}
                        onChange={e => setBranchCode(e.target.value)}
                        className="bg-white border-slate-200 h-14 rounded-2xl font-black uppercase tracking-widest text-xs focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals & Verification Section */}
              <div className="glass-card rounded-[3rem] p-12 border-none relative overflow-hidden shadow-3xl shadow-slate-200/50 bg-slate-900 group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[150px] -mr-48 -mt-48 rounded-full animate-pulse" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] -ml-32 -mb-32 rounded-full" />

                <div className="flex flex-col lg:flex-row gap-16 relative z-10">
                  <div className="flex-1 space-y-10">
                    <div className="flex items-center gap-6">
                      <div className="p-5 bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 shadow-2xl">
                        <ShieldCheck className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.3em] leading-none mb-2">Security & Compliance</h3>
                        <p className="text-2xl font-display font-black text-white tracking-tight uppercase">Fiscal Verification</p>
                      </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-white/10 shadow-2xl space-y-6">
                      <div className="flex items-center gap-6">
                        <div className="bg-white rounded-3xl h-24 w-24 flex items-center justify-center p-4 flex-shrink-0 shadow-3xl">
                          <div className="grid grid-cols-3 gap-1 w-full h-full opacity-10">
                            {[...Array(9)].map((_, i) => <div key={i} className="bg-slate-900 rounded-sm" />)}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <p className="font-black text-white uppercase tracking-widest text-xs">Digital DNA Encapsulation</p>
                          <p className="text-xs font-bold text-white/40 leading-relaxed max-w-sm uppercase tracking-tight">
                            Upon final execution, a unique ZIMRA-signed identity and encrypted QR matrix will be merged into this document for legal persistence.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 lg:max-w-md">
                    <div className="bg-white/5 backdrop-blur-3xl rounded-[2.5rem] p-10 space-y-8 border border-white/10 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                      <div className="space-y-4">
                        <div className="flex justify-between items-center px-2">
                          <span className="text-white/40 font-black uppercase tracking-widest text-[10px]">{!taxInclusive ? "Basis Amount" : "Combined Total"}</span>
                          <span className="font-mono font-black text-white text-xl tracking-tighter">{currentSymbol}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>

                        <div className="bg-black/20 rounded-3xl p-6 border border-white/5 shadow-inner">
                          <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6 border-b border-white/5 pb-3">Duty Breakdown</h4>
                          <div className="space-y-5">
                            {Object.entries(taxBreakdown).length > 0 ? Object.entries(taxBreakdown).map(([key, vals]) => {
                              const mTax = taxTypes.data?.find((t: any) => t.id == vals.taxTypeId);
                              const isExempt = mTax?.zimraTaxId == "1" || mTax?.zimraCode === 'C' || mTax?.zimraCode === 'E' || mTax?.name?.toLowerCase().includes('exempt');

                              return (
                                <div key={key} className="flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-3">
                                    <div className={cn("w-2 h-2 rounded-full", isExempt ? "bg-white/20" : "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]")}></div>
                                    <span className="text-white/60 font-black uppercase tracking-widest text-[10px]">
                                      {isExempt ? (mTax?.name || "Tax Exempt") : `VAT NODE (${Number(vals.rate).toFixed(1)}%)`}
                                    </span>
                                  </div>
                                  <span className="font-mono font-black text-white/90">
                                    {isExempt ? "-" : `${currentSymbol}${vals.tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                  </span>
                                </div>
                              );
                            }) : (
                              <div className="flex justify-between items-center text-xs opacity-30">
                                <span className="text-white/40 font-black uppercase tracking-widest text-[10px]">No duties applied</span>
                                <span className="font-mono font-black text-white/90">-</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-white/10">
                        <div className="flex justify-between items-end">
                          <div>
                            <span className="text-primary font-black uppercase tracking-[0.4em] text-[10px] block mb-1">Final Settlement</span>
                            <span className="text-white/40 font-bold text-[10px] uppercase tracking-widest">Total Liability</span>
                          </div>
                          <div className="text-right">
                            <div className="text-4xl font-display font-black text-white tracking-tighter leading-none mb-1">
                              {currentSymbol}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10px] font-mono font-black text-primary/60 uppercase tracking-widest">
                              {currencyCode} EQUIVALENT
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
        </div>

      </div >

      {/* Validation Warning Dialog */}
      < Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog} >
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
      </Dialog >

      {/* PDF Preview Dialog */}
      < Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen} >
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
      </Dialog >
    </Layout >
  );
}
