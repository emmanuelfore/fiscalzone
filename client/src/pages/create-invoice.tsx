﻿import { Layout } from "@/components/layout";
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
              onClick={() => handleActionClick('draft')}
              disabled={loadingAction !== null || isLockedByOther}
            >
              {loadingAction === 'draft' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button
              variant="outline"
              onClick={() => handleActionClick('quote')}
              disabled={loadingAction !== null || isLockedByOther}
              className="hover:bg-slate-50"
            >
              {loadingAction === 'quote' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
              Save as Quotation
            </Button>
            <Button
              onClick={() => handleActionClick('issue')}
              disabled={loadingAction !== null || isLockedByOther}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {loadingAction === 'issue' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Issue Invoice
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => setIsPreviewOpen(true)}>
              <Eye className="w-4 h-4" />
              Preview PDF
            </Button>


          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-white shadow-xl border border-slate-200 rounded-2xl overflow-hidden">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 px-8 md:px-12 py-8">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-6">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                    {searchParams.get('type') === 'quote' || existingInvoice?.status === 'quote'
                      ? "OFFICIAL QUOTATION"
                      : (existingInvoice?.fiscalCode
                        ? (existingInvoice?.transactionType === "CreditNote" ? "FISCAL CREDIT NOTE" : (existingInvoice?.transactionType === "DebitNote" ? "FISCAL DEBIT NOTE" : (company?.vatRegistered ? "FISCAL TAX INVOICE" : "FISCAL INVOICE")))
                        : (existingInvoice?.transactionType === "CreditNote" ? "CREDIT NOTE" : (existingInvoice?.transactionType === "DebitNote" ? "DEBIT NOTE" : "TAX INVOICE")))
                    }
                  </h1>
                  <p className="text-slate-600 text-lg">Create and customize your document</p>
                </div>

                <div className="flex flex-col items-start lg:items-end gap-4">
                  <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <Button
                      variant={taxInclusive ? "ghost" : "default"}
                      size="sm"
                      onClick={() => setTaxInclusive(false)}
                      className="text-sm font-medium px-4 py-2"
                    >
                      Tax Exclusive
                    </Button>
                    <Button
                      variant={taxInclusive ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setTaxInclusive(true)}
                      className="text-sm font-medium px-4 py-2"
                    >
                      Tax Inclusive
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">Choose your tax calculation method</p>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="px-8 md:px-12 py-10 space-y-12">

              {/* Invoice Details Header */}
              <div className="bg-slate-50/30 rounded-2xl p-8 border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-6 uppercase tracking-wide">Document Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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

                  </div>
                </div>
              </div>

              {/* Seller & Buyer Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Seller Details */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Seller</h3>
                  </div>
                  <div className="flex gap-6 items-start">
                    {company?.logoUrl && (
                      <div className="flex-shrink-0">
                        <img
                          src={company.logoUrl}
                          alt="Company Logo"
                          className="h-20 w-32 object-contain rounded-lg border border-slate-100"
                          onError={(e) => {
                            console.error("Logo load error:", e);
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <h4 className="text-xl font-bold text-slate-900">{company?.tradingName || company?.name || "Company Name"}</h4>
                      <div className="text-slate-600 space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <p><span className="font-medium text-slate-500">TIN:</span> <span className="font-mono text-slate-900">{company?.tin || "-"}</span></p>
                          <p><span className="font-medium text-slate-500">VAT:</span> <span className="font-mono text-slate-900">{company?.vatNumber || "-"}</span></p>
                        </div>
                        <p><span className="font-medium text-slate-500">Address:</span> {company?.address || "Address Line 1"}, {company?.city}</p>
                        <p><span className="font-medium text-slate-500">Contact:</span> {company?.email} {company?.phone && `| ${company?.phone}`}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Buyer Details */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Buyer</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700 block">Select Customer</Label>
                      <div className="flex gap-2">
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={open}
                              className="flex-1 justify-between bg-white border-slate-200 h-12 text-sm"
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
                      </div>
                    </div>

                    {/* Selected Customer Details */}
                    {customerId && (() => {
                      const c = customers?.find(cust => cust.id.toString() === customerId);
                      if (!c) return null;
                      return (
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <h4 className="text-lg font-bold text-slate-900 mb-3">{c.name}</h4>
                          <div className="text-slate-600 space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                              <p><span className="font-medium text-slate-500">TIN:</span> <span className="font-mono text-slate-900">{c.tin || "-"}</span></p>
                              <p><span className="font-medium text-slate-500">VAT:</span> <span className="font-mono text-slate-900">{c.vatNumber || "-"}</span></p>
                            </div>
                            <p><span className="font-medium text-slate-500">Address:</span> {c.address || "No Address"}, {c.city}</p>
                            <p><span className="font-medium text-slate-500">Contact:</span> {c.email} {c.phone && `| ${c.phone}`}</p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Invoice Items Section */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Invoice Items</h3>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-100">
                      <TableRow className="hover:bg-slate-50">
                        <TableHead className="w-[240px] pl-4">Item (Search Name/Code)</TableHead>
                        <TableHead className="min-w-[150px]">Description</TableHead>
                        <TableHead className="w-[100px] text-center">Qty</TableHead>
                        <TableHead className="w-[140px] text-right">
                          <div>Unit Price {taxInclusive ? '(Incl)' : '(Excl)'}</div>
                          <div className="text-[10px] lowercase font-normal text-slate-400 no-underline">(Neg. for discount)</div>
                        </TableHead>
                        <TableHead className="w-[120px] text-right">Total Amount (incl. tax)</TableHead>
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

                          // Determine Tax Status
                          const matchingType = taxTypes.data?.find((t: any) => t.id == item.taxTypeId);
                          const isExempt = matchingType?.zimraTaxId == 1 || matchingType?.zimraTaxId == "1" || matchingType?.zimraCode === 'C' || matchingType?.zimraCode === 'E' || matchingType?.name?.toLowerCase().includes('exempt');
                          const isZeroRated = matchingType?.zimraTaxId == 2 || matchingType?.zimraTaxId == "2" || matchingType?.zimraCode === 'D' || matchingType?.name?.toLowerCase().includes('zero rated') || (!isExempt && item.taxRate === 0);

                          return (
                            <motion.tr
                              key={item.localId}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                              className="group hover:bg-slate-50/30 transition-colors border-b border-slate-50"
                            >
                              <TableCell className="align-middle pl-4 py-3 max-w-[240px]">
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
                                  step="0.01"
                                  value={Number(item.unitPrice)}
                                  onChange={(e) => updateItem(item.localId, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  onBlur={(e) => {
                                    // Allow negative values for discounts
                                    const val = parseFloat(e.target.value) || 0;
                                    updateItem(item.localId, 'unitPrice', parseFloat(val.toFixed(2)));
                                  }}
                                  className="bg-transparent border-transparent hover:border-slate-200 focus:border-primary focus:bg-white h-9 px-2 text-right text-sm font-mono w-full transition-all"
                                />
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

              {/* Notes & Banking Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Notes Section */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Notes</h3>
                      {(existingInvoice?.transactionType === "CreditNote" || existingInvoice?.transactionType === "DebitNote") && (
                        <span className="text-xs font-bold text-red-500 uppercase tracking-tight">Required for CN/DN</span>
                      )}
                    </div>
                  </div>
                  <Textarea
                    placeholder="Invoice notes, terms and conditions, payment instructions, etc."
                    className="bg-slate-50 border-slate-200 min-h-[120px] resize-none text-sm rounded-lg"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-2">These notes will appear on the invoice</p>
                </div>

                {/* Banking Details Section */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Banking Details</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-slate-400">Bank Name</Label>
                        <Input
                          placeholder="e.g. Stanbic, CBZ"
                          value={bankName}
                          onChange={e => setBankName(e.target.value)}
                          className="bg-white border-slate-200 h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-slate-400">Account Name</Label>
                        <Input
                          placeholder="Beneficiary Name"
                          value={accountName}
                          onChange={e => setAccountName(e.target.value)}
                          className="bg-white border-slate-200 h-10"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-slate-400">Account Number</Label>
                        <Input
                          placeholder="Account Number"
                          value={accountNumber}
                          onChange={e => setAccountNumber(e.target.value)}
                          className="bg-white border-slate-200 h-10 font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase text-slate-400">Branch Code</Label>
                        <Input
                          placeholder="Sort Code"
                          value={branchCode}
                          onChange={e => setBranchCode(e.target.value)}
                          className="bg-white border-slate-200 h-10"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals & Verification Section */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 uppercase tracking-wide">Invoice Summary</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">{!taxInclusive ? "Total (excl. tax)" : "Subtotal"}</span>
                    <span className="font-mono font-bold text-slate-900">{currentSymbol}{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 my-4">
                    <h4 className="text-[10px] font-bold text-slate-700 uppercase mb-2 text-center">Tax Analysis</h4>
                    <div className="grid grid-cols-4 gap-2 text-[9px] font-bold text-slate-500 uppercase mb-1 border-b border-slate-200 pb-1">
                      <div className="text-left font-bold text-slate-500 uppercase">VAT %</div>
                      <div className="text-right">Net.Amt</div>
                      <div className="text-right">VAT</div>
                      <div className="text-right">Amount</div>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(taxBreakdown).map(([key, vals]) => {
                        const mTax = taxTypes.data?.find((t: any) => t.id == vals.taxTypeId);
                        // Strict check for Exempt first
                        const isExempt = mTax?.zimraTaxId == 1 || mTax?.zimraTaxId == "1" || mTax?.zimraCode === 'C' || mTax?.zimraCode === 'E' || mTax?.name?.toLowerCase().includes('exempt');
                        // If not explicitly exempt, and rate is 0, default to Zero Rated (matches backend)
                        const isZeroRated = mTax?.zimraTaxId == 2 || mTax?.zimraTaxId == "2" || mTax?.zimraCode === 'D' || mTax?.name?.toLowerCase().includes('zero rated') || (!isExempt && vals.rate === 0);

                        return (
                          <div key={key} className="grid grid-cols-4 gap-2 text-[10px] items-center py-1 border-b border-slate-100 last:border-0">
                            <div className="text-slate-600 truncate">
                              {isExempt ? (mTax?.name || "Exempt") : `${Number(vals.rate).toFixed(2)}%`}
                            </div>
                            <div className="text-right font-mono text-slate-700">
                              {vals.net.toFixed(2)}
                            </div>
                            <div className="text-right font-mono text-slate-700">
                              {isExempt ? "-" : vals.tax.toFixed(2)}
                            </div>
                            <div className="text-right font-mono font-bold text-slate-900">
                              {(vals.net + vals.tax).toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-3 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Total Tax</span>
                    <span className="font-mono font-bold text-slate-900">{currentSymbol}{taxAmount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center py-4 bg-slate-50 rounded-lg px-4">
                    <span className="text-xl font-bold text-slate-900">Total</span>
                    <span className="text-xl font-mono font-bold text-slate-900">{currentSymbol}{total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800">Verification</h4>
                      <p className="text-xs text-slate-500">Will be generated on submission</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-white border-2 border-slate-100 rounded-lg h-16 w-16 flex items-center justify-center text-[10px] text-slate-400 text-center p-1 flex-shrink-0">
                        [QR]
                      </div>
                      <div className="text-xs text-slate-600 leading-relaxed">
                        <p className="font-medium mb-1">Digital Verification</p>
                        <p>QR code and fiscal signature will be automatically generated when you submit this invoice to ZIMRA for compliance verification.</p>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Validation Warnings
            </DialogTitle>
            <div className="text-sm text-slate-500 mt-2">
              Please review the following potential issues before proceeding:
            </div>
          </DialogHeader>
          <div className="py-4 space-y-3">
            {validationWarnings.map((warning, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg text-amber-800 text-sm border border-amber-100">
                <span className="mt-0.5">•</span>
                <span>{warning.replace('⚠️ ', '')}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              Back to Edit
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => pendingAction && executeAction(pendingAction)}
            >
              Proceed Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>Invoice Preview - Debug Info</DialogTitle>
            <div className="text-xs text-slate-500 mt-2">
              Customer: {customerId ? 'âœ…' : 'âŒ'} |
              Company: {company ? 'âœ…' : 'âŒ'} |
              Items: {items.length} |
              Subtotal: {subtotal} |
              Tax: {taxAmount} |
              Total: {total}
            </div>
          </DialogHeader>
          <div className="flex-1 h-full min-h-[500px] w-full bg-slate-100 rounded-md overflow-hidden">
            {customerId && company && items.length > 0 ? (
              <div className="w-full h-full relative">
                {/* PDF Preview Placeholder */}
                <div className="w-full h-full bg-white flex items-center justify-center">
                  <div className="text-center p-8 max-w-md">
                    <div className="mb-6">
                      <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="text-lg font-medium text-slate-900 mb-2">PDF Preview</h3>
                      <p className="text-sm text-slate-600">
                        PDF preview is not available in development mode. Use the download button below to test PDF generation.
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 text-left">
                      <h4 className="text-sm font-medium text-slate-900 mb-2">Invoice Details:</h4>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p><strong>Number:</strong> DRAFT</p>
                        <p><strong>Customer:</strong> {customers?.find(c => c.id.toString() === customerId)?.name}</p>
                        <p><strong>Items:</strong> {items.length}</p>
                        <p><strong>Total:</strong> {currentSymbol}{total.toFixed(2)}</p>
                        <p><strong>Currency:</strong> {currencyCode}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-center p-8">
                <div>
                  <p className="text-lg font-medium mb-2 text-slate-600">PDF Preview Unavailable</p>
                  <p className="mb-4">Please ensure all requirements are met to preview PDF.</p>
                  <div className="space-y-1 text-sm max-w-md">
                    {!customerId && <p className="text-red-600">âŒ Customer not selected</p>}
                    {customerId && !company && <p className="text-red-600">âŒ Company details not loaded</p>}
                    {items.length === 0 && <p className="text-red-600">âŒ No invoice items added</p>}
                    {customerId && company && items.length > 0 && <p className="text-green-600">âœ… All requirements met - PDF should work</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {customerId && company && items.length > 0 && (
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
              >
                {({ blob, url, loading, error }) => {
                  if (error) {
                    console.error('PDF Generation Error:', error);
                    return (
                      <div className="space-y-2">
                        <Button disabled className="gap-2 bg-red-100 text-red-700 border-red-200 w-full">
                          <Download className="w-4 h-4" />
                          PDF Generation Failed
                        </Button>
                        <p className="text-xs text-red-600">Check browser console for details</p>
                      </div>
                    );
                  }
                  if (loading) {
                    return (
                      <Button disabled className="gap-2 w-full">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Generating PDF...
                      </Button>
                    );
                  }
                  return (
                    <Button className="gap-2 w-full">
                      <Download className="w-4 h-4" />
                      Download PDF ({(blob?.size || 0) > 0 ? `${Math.round((blob?.size || 0) / 1024)}KB` : 'Ready'})
                    </Button>
                  );
                }}
              </PDFDownloadLink>
            )}

            {/* Additional download button for testing */}
            {customerId && company && items.length > 0 && (
              <Button
                variant="outline"
                onClick={() => {
                  console.log('Testing PDF generation with:', {
                    customerId,
                    company: !!company,
                    itemsCount: items.length,
                    hasSubtotal: !!subtotal,
                    currency: currencyCode
                  });
                }}
                className="gap-2"
              >
                Test PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout >
  );
}