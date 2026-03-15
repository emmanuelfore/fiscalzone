import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { LinearGradient } from "expo-linear-gradient";
import {
  Moon,
  Sun,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  User,
  Wifi,
  WifiOff,
  X,
  CheckCircle2,
  Download,
  Trash2,
  Tag,
  CreditCard,
  Banknote,
  ChevronDown,
  CloudUpload,
  History,
  ScanLine,
  Menu,
  Printer,
  Bluetooth,
  ToggleLeft,
  ToggleRight,
  Clock,
  Play,
  Pause,
  MonitorSmartphone
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { printReceipt, printToBluetooth } from "../lib/printing";
import * as Print from 'expo-print';
import { StatusBar } from "expo-status-bar";
import { PremiumColors } from "../ui/PremiumColors";
import { useProducts, useCreateInvoice, useCustomers, useCompany, useCurrencies, useTaxTypes } from "../hooks/usePosData";
import { apiFetch } from "../lib/api";
import { supabase } from "../lib/supabase";
import { ManagerPinModal } from "../ui/ManagerPinModal";
import {
  addPendingSale,
  getPendingSales,
  removePendingSale,
  addPendingShiftAction,
  getPendingShiftActions,
  removePendingShiftAction,
  getProvisionalShift,
  setProvisionalShift
} from "../lib/offlineQueue";

// ─── v3 colour tokens ─────────────────────────────────────────────────────────
const C = {
  bg: "#07090c",
  s1: "#0d1117",
  s2: "#141b24",
  s3: "#1c2633",
  border: "#1f2d3d",
  accent: "#f0a500",
  accent2: "#ff6b35",
  green: "#00d084",
  red: "#ff4757",
  blue: "#3b9eff",
  purple: "#a78bfa",
  text: "#e8edf5",
  muted: "#3d5166",
} as const;

const CAT_PALETTE = [
  "#f0a500", "#3b9eff", "#00d084", "#ff6b35",
  "#a78bfa", "#f43f5e", "#06b6d4", "#84cc16",
  "#fb923c", "#e879f9",
];

const PROD_EMOJIS = ["📦", "💼", "🏷️", "📋", "🗂️", "🔑", "⚙️", "🛠️", "🧩", "💡", "🎯", "🖥️", "📱", "🔧", "🗃️", "💎"];

interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
  discountAmount: number;
  taxRate: number;
  taxTypeId?: number | null;
  hsCode?: string;
  category?: string;
  stockLevel?: number;
  isTracked?: boolean;
}

interface HeldSale {
  id: number | string;
  holdName: string;
  total: number;
  orderDiscount: number;
  createdAt: string;
  cartData: CartItem[];
  _offline?: boolean;
}

type Props = {
  companyId: number;
  onOpenDrawer: () => void;
};

export function POSScreen({ companyId, onOpenDrawer }: Props) {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);

  const {
    data: productsData,
    isLoading: loadingProducts,
    fromCache: productsFromCache
  } = useProducts(companyId);
  const { data: customersData, fromCache: customersFromCache } = useCustomers(companyId);
  const { data: company } = useCompany(companyId);
  const { data: currencies } = useCurrencies(companyId);
  const { data: taxTypes } = useTaxTypes(companyId);
  const { create: createInvoice } = useCreateInvoice(companyId);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [orderDiscountInput, setOrderDiscountInput] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);
  const [showHoldsModal, setShowHoldsModal] = useState(false);
  const [holdName, setHoldName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);

  // -- Advanced Printer Settings --
  const [tempPrinterAddress, setTempPrinterAddress] = useState("");
  const [tempAutoPrint, setTempAutoPrint] = useState(false);
  const [tempAutoShowModal, setTempAutoShowModal] = useState(true);
  const [tempSilentPrint, setTempSilentPrint] = useState(false);
  const [tempTerminalId, setTempTerminalId] = useState("");
  const [tempTargetPrinter, setTempTargetPrinter] = useState("");

  const [printerConfig, setPrinterConfig] = useState({
    macAddress: "",
    autoPrint: false,
    autoShowModal: true,
    silentPrint: false,
    terminalId: "POS-01",
    targetPrinter: ""
  });

  const [lastInvoice, setLastInvoice] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [printerAddress, setPrinterAddress] = useState<string>("");
  const [isPrinting, setIsPrinting] = useState(false);
  const [cashierName, setCashierName] = useState<string>("Cashier");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isParking, setIsParking] = useState(false);

  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [shiftModalType, setShiftModalType] = useState<"OPEN" | "CLOSE">("OPEN");
  const [shiftBalance, setShiftBalance] = useState("");

  const [pendingOverride, setPendingOverride] = useState<{ type: "DISCOUNT" | "VOID_CART"; data: any } | null>(null);

  useEffect(() => {
    const currentInputVal = parseFloat(orderDiscountInput.replace(",", ".")) || 0;
    if (Math.abs(currentInputVal - orderDiscount) > 0.001) {
      setOrderDiscountInput(orderDiscount === 0 ? "" : orderDiscount.toString());
    }
  }, [orderDiscount]);

  const resolvedProducts: any[] = productsData || [];
  const resolvedCustomers: any[] = customersData || [];
  const resolvedCurrencies: any[] = currencies || [];
  const taxInclusive = company?.vatEnabled ?? false;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);
      if (online) syncQueued(false);
    });
    return () => unsubscribe();
  }, [companyId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setCashierName(
          data.user.user_metadata?.full_name ||
          data.user.user_metadata?.name ||
          data.user.email?.split("@")[0] ||
          "Cashier"
        );
      }
    });
  }, []);

  useEffect(() => {
    if (showSuccess) {
      // Don't auto-close if silentPrint, autoPrint, or autoShowModal is on
      if (printerConfig.silentPrint || printerConfig.autoPrint || printerConfig.autoShowModal) {
        return;
      }
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, printerConfig.silentPrint, printerConfig.autoPrint]);

  useEffect(() => {
    let cancelled = false;
    const refreshQueue = async () => {
      const sales = await getPendingSales(companyId);
      const shifts = await getPendingShiftActions(companyId);
      if (!cancelled) setQueueCount(sales.length + shifts.length);
    };
    refreshQueue();
    const id = setInterval(refreshQueue, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [companyId]);

  useEffect(() => {
    AsyncStorage.getItem(`printer_config_${user?.id}`).then(val => {
      if (val) {
        try {
          const cfg = JSON.parse(val);
          setPrinterConfig(cfg);
        } catch (e) { }
      }
    });
  }, [companyId, user?.id]);

  const savePrinterConfig = async (cfg: any) => {
    setPrinterConfig(cfg);
    await AsyncStorage.setItem(`printer_config_${user?.id}`, JSON.stringify(cfg));
  };


  const defaultCustomerId = useMemo(() => {
    if (!resolvedCustomers.length) return null;
    const flagged = resolvedCustomers.find((c: any) => c.isDefault === true);
    if (flagged) return flagged.id;
    const named = resolvedCustomers.find((c: any) =>
      c.name.toLowerCase().includes("walk-in") ||
      c.name.toLowerCase().includes("cash") ||
      c.name.toLowerCase().includes("guest")
    );
    return named ? named.id : resolvedCustomers[0].id;
  }, [resolvedCustomers]);

  useEffect(() => {
    if (!selectedCustomerId && defaultCustomerId) setSelectedCustomerId(defaultCustomerId);
  }, [defaultCustomerId, selectedCustomerId]);

  const resetToDefaultCustomer = () => {
    if (defaultCustomerId) setSelectedCustomerId(defaultCustomerId);
  };

  const categories = useMemo(() => {
    if (!resolvedProducts.length) return ["All"];
    const cats = new Set(resolvedProducts.map((p: any) => p.category || "Uncategorized"));
    return ["All", ...Array.from(cats)];
  }, [resolvedProducts]);

  const filteredProducts = useMemo(() => {
    try {
      return resolvedProducts.filter((p: any) => {
        if (!p) return false;
        const matchesSearch =
          !search ||
          (p.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (p.sku?.toLowerCase().includes(search.toLowerCase()) ?? false);
        const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
      });
    } catch (e) {
      console.error("FilteredProducts error:", e);
      return [];
    }
  }, [resolvedProducts, search, selectedCategory]);

  const currencyInfo = useMemo(() => {
    if (selectedCurrency === "USD") return { symbol: "$", rate: 1 };
    const cur = (currencies || []).find((c: any) => c.code === selectedCurrency);
    return {
      symbol: cur?.symbol || selectedCurrency,
      rate: Number(cur?.exchangeRate || 1)
    };
  }, [selectedCurrency, currencies]);

  const fmt = (val: number) => {
    const converted = val * currencyInfo.rate;
    return `${currencyInfo.symbol}${converted.toFixed(2)}`;
  };

  const { subtotal, taxAmount } = useMemo(() => {
    try {
      let sub = 0; let tax = 0;
      cart.forEach((item: CartItem) => {
        if (!item) return;
        const lineTotal = Number(item.price || 0) * Number(item.quantity || 0) - Number(item.discountAmount || 0);
        const rate = (item.taxRate || 0) / 100;
        if (taxInclusive) {
          const taxPortion = lineTotal - lineTotal / (1 + rate);
          sub += lineTotal - taxPortion; tax += taxPortion;
        } else {
          sub += lineTotal; tax += lineTotal * rate;
        }
      });
      return { subtotal: sub, taxAmount: tax };
    } catch (e) {
      console.error("Subtotal calc error:", e);
      return { subtotal: 0, taxAmount: 0 };
    }
  }, [cart, taxInclusive]);

  const total = Math.max(0, subtotal + taxAmount - orderDiscount);
  const selectedCustomer = resolvedCustomers.find((c: any) => c.id === selectedCustomerId);
  const isDefaultCustomerSelected = selectedCustomerId === defaultCustomerId;

  const addToCart = (product: any) => {
    if (product.isTracked) {
      const inCart = cart.find((item: CartItem) => item.productId === product.id)?.quantity || 0;
      if (inCart >= Number(product.stockLevel || 0)) return;
    }
    setCart((prev: CartItem[]) => {
      const existing = prev.find((item: CartItem) => item.productId === product.id);
      if (existing) {
        return prev.map((item: CartItem) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      let taxRate = company?.vatRegistered ? Number(product.taxRate ?? 15) : 0;
      if (company?.vatRegistered && product.taxCategoryId && taxTypes) {
        const category = (taxTypes as any[]).find((t: any) => t.id === product.taxCategoryId);
        if (category) taxRate = Number(category.rate);
      }
      return [...prev, {
        productId: product.id, name: product.name, price: Number(product.price),
        quantity: 1, discountAmount: 0, taxRate,
        taxTypeId: product.taxTypeId, hsCode: product.hsCode, category: product.category,
        stockLevel: Number(product.stockLevel || 0), isTracked: product.isTracked
      }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((prev: CartItem[]) =>
      prev.map((item: CartItem) => {
        if (item.productId !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        if (item.isTracked && newQty > (item.stockLevel || 0)) return item;
        return { ...item, quantity: newQty };
      })
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev: CartItem[]) => prev.filter((item: CartItem) => item.productId !== productId));
  };

  const handleOrderDiscountChange = (val: string) => {
    setOrderDiscountInput(val);
    const amount = parseFloat(val.replace(",", ".")) || 0;
    const rawTotal = subtotal + taxAmount;
    if (amount > rawTotal) { setOrderDiscount(rawTotal); return; }
    if (amount <= subtotal * 0.1) setOrderDiscount(amount);
  };

  const handleDiscountSubmit = () => {
    const amount = parseFloat(orderDiscountInput.replace(",", ".")) || 0;
    const rawTotal = subtotal + taxAmount;
    if (amount > rawTotal) { setOrderDiscount(rawTotal); setOrderDiscountInput(rawTotal.toString()); return; }
    if (amount > subtotal * 0.1) setPendingOverride({ type: "DISCOUNT", data: amount });
    else setOrderDiscount(amount);
  };

  const handleClearCart = () => {
    if (!cart.length) return;
    setPendingOverride({ type: "VOID_CART", data: null });
  };

  const fetchHeldSales = async () => {
    try {
      const res = await apiFetch(`/api/pos/holds?companyId=${companyId}`);
      if (res.ok) {
        const data = (await res.json()) as any[];
        setHeldSales(data.map((h) => ({
          id: h.id, holdName: h.holdName, total: Number(h.total || 0),
          orderDiscount: Number(h.orderDiscount || 0), createdAt: h.createdAt,
          cartData: h.cartData || [], _offline: h._offline
        })));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchHeldSales(); }, [companyId]);

  const fetchShift = async () => {
    if (isOnline) {
      try {
        const res = await apiFetch(`/api/pos/shifts/current?companyId=${companyId}`);
        if (res.ok) {
          const data = await res.json();
          setCurrentShift(data || null);
          await setProvisionalShift(companyId, null);
          return;
        }
      } catch { /* ignore */ }
    }
    const provisional = await getProvisionalShift(companyId);
    if (provisional) setCurrentShift(provisional);
  };

  useEffect(() => { fetchShift(); }, [companyId, isOnline]);

  const openShift = async () => {
    Keyboard.dismiss();
    const openingBalance = shiftBalance || "0";
    try {
      if (isOnline) {
        const res = await apiFetch("/api/pos/shifts/open", { method: "POST", body: JSON.stringify({ companyId, openingBalance }) });
        if (res.ok) { setShowShiftModal(false); setShiftBalance(""); await fetchShift(); return; }
        else Alert.alert("Shift Error", await res.text().catch(() => "Unknown error"));
      }
      await addPendingShiftAction({ companyId, type: "open", payload: { openingBalance } });
      const provisional = { id: Date.now(), companyId, status: "OPEN", openingBalance, openedAt: new Date().toISOString(), _provisional: true };
      setCurrentShift(provisional);
      await setProvisionalShift(companyId, provisional);
      setShowShiftModal(false); setShiftBalance("");
    } catch { /* ignore */ }
  };

  const closeShift = async () => {
    Keyboard.dismiss();
    if (!currentShift) return;
    const closingBalance = shiftBalance || "0";
    try {
      if (isOnline && !currentShift._provisional) {
        const res = await apiFetch(`/api/pos/shifts/${currentShift.id}/close`, { method: "POST", body: JSON.stringify({ closingBalance }) });
        if (res.ok) { setCurrentShift(null); await setProvisionalShift(companyId, null); setShowShiftModal(false); setShiftBalance(""); return; }
        else Alert.alert("Shift Error", await res.text().catch(() => "Unknown error"));
      }
      await addPendingShiftAction({ companyId, type: "close", payload: { shiftId: Number(currentShift.id), closingBalance } });
      setCurrentShift(null); await setProvisionalShift(companyId, null); setShowShiftModal(false); setShiftBalance("");
    } catch { /* ignore */ }
  };

  const syncQueued = async (isManual = false) => {
    if (!isOnline || isSyncing) return;
    const shiftActions = await getPendingShiftActions(companyId);
    const sales = await getPendingSales(companyId);

    if (shiftActions.length === 0 && sales.length === 0) {
      if (isManual) Alert.alert("Sync", "Everything is already synced.");
      return;
    }

    setIsSyncing(true);
    if (isManual) {
      Alert.alert("Syncing", `Starting sync of ${shiftActions.length + sales.length} queued actions...`);
    }

    let successCount = 0;
    try {
      for (const action of shiftActions) {
        try {
          if (action.type === "open") {
            const res = await apiFetch("/api/pos/shifts/open", { method: "POST", body: JSON.stringify({ companyId, openingBalance: action.payload.openingBalance }) });
            if (res.ok) { await removePendingShiftAction(action.id); successCount++; }
          } else {
            const res = await apiFetch(`/api/pos/shifts/${action.payload.shiftId}/close`, { method: "POST", body: JSON.stringify({ closingBalance: action.payload.closingBalance }) });
            if (res.ok) { await removePendingShiftAction(action.id); successCount++; }
          }
        } catch (err) {
          console.error("Shift sync error:", err);
          break;
        }
      }
      for (const sale of sales) {
        try {
          const res = await apiFetch(`/api/companies/${companyId}/invoices`, { method: "POST", body: JSON.stringify(sale.payload) });
          if (res.ok) { await removePendingSale(sale.id); successCount++; }
        } catch (err) {
          console.error("Sale sync error:", err);
          break;
        }
      }
    } finally {
      setIsSyncing(false);
      if (successCount > 0 && isManual) {
        Alert.alert("Sync Complete", `Successfully synced ${successCount} items.`);
      }
    }
  };

  const handleParkSale = async () => {
    Keyboard.dismiss();
    if (!cart.length || isParking) return;
    setIsParking(true);
    const name = holdName.trim() || `Hold #${heldSales.length + 1}`;
    const payload = {
      companyId,
      customerId: selectedCustomerId,
      holdName: name,
      total: total.toFixed(2),
      orderDiscount: orderDiscount.toFixed(2),
      cartData: cart
    };
    try {
      if (isOnline) {
        const res = await apiFetch("/api/pos/holds", { method: "POST", body: JSON.stringify(payload) });
        if (res.ok) {
          await fetchHeldSales();
          // No alert here as per request
        } else {
          const err = await res.text();
          Alert.alert("Error", `Failed to park sale: ${err}`);
        }
      } else {
        const offlineHold: HeldSale = {
          id: `offline_${Date.now()}`,
          holdName: `${name} (Offline)`,
          total,
          orderDiscount,
          createdAt: new Date().toISOString(),
          cartData: cart,
          _offline: true
        };
        setHeldSales((prev: HeldSale[]) => [offlineHold, ...prev]);
        // Remove alert even for offline as per "remove alert box when you clean park sale"
      }
      setCart([]);
      setOrderDiscount(0);
      setOrderDiscountInput("");
      setPaidAmount("");
      setHoldName("");
      setShowCart(false);
    } catch (e: any) {
      Alert.alert("Error", e.message || "An unexpected error occurred.");
    } finally {
      setIsParking(false);
    }
  };

  const handleResumeHold = async (hold: HeldSale) => {
    setCart(hold.cartData);
    setOrderDiscount(hold.orderDiscount || 0);
    setOrderDiscountInput((hold.orderDiscount || 0).toString());
    setShowHoldsModal(false); setShowCart(true);
    try {
      if (!hold._offline) await apiFetch(`/api/pos/holds/${hold.id}`, { method: "DELETE" });
      await fetchHeldSales();
    } catch { /* ignore */ }
  };

  const handleCheckout = () => {
    Keyboard.dismiss();
    if (!cart.length) return;
    if (!selectedCustomerId) {
      if (defaultCustomerId) setSelectedCustomerId(defaultCustomerId);
      else return;
    }
    setPaidAmount((total * currencyInfo.rate).toFixed(2));
    setShowCheckout(true);
  };

  const processOrder = async () => {
    if (!selectedCustomerId) return;
    const paid = parseFloat(paidAmount || "0");
    if (paid < total) return;
    const currencyObj = resolvedCurrencies.find((c: any) => c.code === selectedCurrency) || { code: "USD", exchangeRate: "1" };
    const invoiceData = {
      customerId: selectedCustomerId,
      subtotal: subtotal.toFixed(2), taxAmount: taxAmount.toFixed(2), total: total.toFixed(2),
      currency: currencyObj.code, exchangeRate: currencyObj.exchangeRate,
      paymentMethod, status: "issued", notes: "POS Transaction (Mobile)",
      discountAmount: orderDiscount.toFixed(2), taxInclusive,
      transactionType: "FiscalInvoice",
      isPos: true, // Mark as POS transaction
      invoiceNumber: `POS-${Date.now()}`,
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      items: cart.map((item: CartItem) => ({
        productId: item.productId, description: item.name,
        quantity: item.quantity.toString(), unitPrice: item.price.toString(),
        discountAmount: item.discountAmount.toString(), taxRate: item.taxRate.toString(),
        lineTotal: (item.price * item.quantity - item.discountAmount).toFixed(2),
        taxTypeId: item.taxTypeId
      }))
    };
    setIsSubmitting(true);
    try {
      // Auto-open shift if needed
      if (!currentShift) {
        const openingBalance = "0";
        if (isOnline) {
          try {
            const res = await apiFetch("/api/pos/shifts/open", {
              method: "POST",
              body: JSON.stringify({ companyId, openingBalance })
            });
            if (res.ok) {
              await fetchShift();
            }
          } catch (e) {
            console.error("Auto-shift open error:", e);
          }
        } else {
          await addPendingShiftAction({ companyId, type: "open", payload: { openingBalance } });
          const provisional = { id: Date.now(), companyId, status: "OPEN", openingBalance, openedAt: new Date().toISOString(), _provisional: true };
          setCurrentShift(provisional);
          await setProvisionalShift(companyId, provisional);
        }
      }

      if (!isOnline) {
        const offlineId = await addPendingSale(companyId, invoiceData);
        setLastInvoice({ ...invoiceData, id: offlineId, _offline: true });
        if (printerConfig.autoShowModal) setShowSuccess(true);
      } else {
        const created = await createInvoice(invoiceData);
        setLastInvoice(created);
        if (printerConfig.autoShowModal) setShowSuccess(true);
      }
      setCart([]); setOrderDiscount(0); setOrderDiscountInput("");
      setShowCheckout(false); setShowCart(false); setPaidAmount("");
      resetToDefaultCustomer();

      // Ensure state updates have processed, then trigger auto-print if configured
      if (printerConfig.autoPrint) {
        setTimeout(() => {
          if (printerConfig.macAddress) handlePrintThermal();
          else handlePrintStandard();
        }, 800);
      }

    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to process order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cartItemCount = cart.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);

  const handlePrintStandard = async () => {
    if (!lastInvoice || !company) return;
    setIsPrinting(true);
    try {
      await printReceipt({
        invoice: lastInvoice,
        company,
        customer: lastInvoice.customerId ? resolvedCustomers?.find((c: any) => c.id === lastInvoice.customerId) : null,
        terminalId: printerConfig.terminalId,
        currencySymbol: currencyInfo.symbol
      }, printerConfig.targetPrinter, printerConfig.silentPrint);
    } catch (e: any) {
      if (e.message !== "Print preview was cancelled.") {
        Alert.alert("Print Error", e.message || "Could not print receipt");
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSelectSystemPrinter = async () => {
    try {
      const printer = await Print.selectPrinterAsync();
      if (printer && printer.url) {
        setTempTargetPrinter(printer.url);
      }
    } catch (error) {
      console.warn("Printer selection canceled or failed:", error);
    }
  };

  const handlePrintThermal = async () => {
    if (!lastInvoice || !company) return;
    if (!printerConfig.macAddress) {
      Alert.alert("Printer Busy", "Please configure your Bluetooth printer address first.");
      return;
    }
    setIsPrinting(true);
    try {
      await printToBluetooth({
        invoice: lastInvoice,
        company,
        customer: lastInvoice.customerId ? resolvedCustomers?.find((c: any) => c.id === lastInvoice.customerId) : null,
        terminalId: printerConfig.terminalId,
        currencySymbol: currencyInfo.symbol
      }, printerConfig.macAddress);
    } catch (e: any) {
      Alert.alert("Thermal Error", e.message || "Failed to print to Bluetooth device");
    } finally {
      setIsPrinting(false);
    }
  };

  const getProductMeta = (product: any, index: number) => ({
    color: CAT_PALETTE[index % CAT_PALETTE.length],
    emoji: PROD_EMOJIS[index % PROD_EMOJIS.length],
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: C.border }}>

        {/* Row 1: brand + online pill + customer */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <TouchableOpacity onPress={onOpenDrawer}
              style={{
                width: 36, height: 36, borderRadius: 10, backgroundColor: C.s2,
                borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center",
                marginRight: 4
              }}>
              <Menu size={20} color={C.accent} />
            </TouchableOpacity>
            <Text style={{ color: C.accent, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 }}>
              POS
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 5,
              paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20,
              backgroundColor: isOnline ? "rgba(0,208,132,0.1)" : "rgba(255,71,87,0.1)",
              borderWidth: 1, borderColor: isOnline ? "rgba(0,208,132,0.25)" : "rgba(255,71,87,0.25)",
            }}>
              <View style={{
                width: 6, height: 6, borderRadius: 3, backgroundColor: isOnline ? C.green : C.red,
                shadowColor: isOnline ? C.green : C.red, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }
              }} />
              {isOnline ? <Wifi size={10} color={C.green} /> : <WifiOff size={10} color={C.red} />}
              {/*<Text style={{ fontSize: 9, fontWeight: "700", color: isOnline ? C.green : C.red, textTransform: "uppercase" }}>
                {isOnline ? "Online" : "Offline"}
              </Text>*/}
            </View>
            {(productsFromCache || customersFromCache) && (
              <View style={{
                paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
                backgroundColor: "rgba(251,191,36,0.1)", borderWidth: 1, borderColor: "rgba(251,191,36,0.3)"
              }}>
                <Clock size={10} color="#facc15" />
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* Currency quick-selector pill */}
            {(currencies && currencies.filter((c: any) => c.code !== "USD").length > 0) && (
              <TouchableOpacity
                onPress={() => {
                  const allCurrencies = ["USD", ...(currencies || []).filter((c: any) => c.code !== "USD").map((c: any) => c.code)];
                  const currentIdx = allCurrencies.indexOf(selectedCurrency);
                  const nextIdx = (currentIdx + 1) % allCurrencies.length;
                  setSelectedCurrency(allCurrencies[nextIdx]);
                }}
                style={{
                  height: 34, borderRadius: 10, backgroundColor: C.s2,
                  borderWidth: 1.5, borderColor: selectedCurrency !== "USD" ? C.accent : C.border,
                  paddingHorizontal: 10, alignItems: "center", justifyContent: "center"
                }}>
                <Text style={{ color: selectedCurrency !== "USD" ? C.accent : C.muted, fontSize: 11, fontWeight: "800" }}>
                  {selectedCurrency}
                </Text>
              </TouchableOpacity>
            )}

            {/* <TouchableOpacity activeOpacity={0.7} onPress={() => setIsDarkMode(!isDarkMode)}
              style={{
                width: 34, height: 34, borderRadius: 10, backgroundColor: C.s2,
                borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center"
              }}>
              {isDarkMode ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#6366f1" />}
            </TouchableOpacity> */}

            <TouchableOpacity activeOpacity={0.7} onPress={() => {
              setTempPrinterAddress(printerConfig.macAddress);
              setTempAutoPrint(printerConfig.autoPrint);
              setTempAutoShowModal(printerConfig.autoShowModal ?? true);
              setTempSilentPrint(printerConfig.silentPrint);
              setTempTerminalId(printerConfig.terminalId);
              setTempTargetPrinter(printerConfig.targetPrinter);
              setShowPrinterSettings(true);
            }}
              style={{
                width: 34, height: 34, borderRadius: 10, backgroundColor: C.s2,
                borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center"
              }}>
              <Printer size={16} color={printerConfig.macAddress || printerConfig.targetPrinter ? C.green : C.muted} />
              {(!!printerConfig.macAddress || !!printerConfig.targetPrinter) && (
                <View style={{
                  position: "absolute", top: -2, right: -2,
                  width: 8, height: 8, borderRadius: 4, backgroundColor: C.green,
                  borderWidth: 1.5, borderColor: C.s2
                }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowCustomerPicker(true)}
              style={{
                width: 34, height: 34, borderRadius: 10,
                backgroundColor: isDefaultCustomerSelected ? "rgba(240,165,0,0.08)" : C.s2,
                borderWidth: 1, borderColor: isDefaultCustomerSelected ? "rgba(240,165,0,0.3)" : C.border,
                alignItems: "center", justifyContent: "center"
              }}>
              <User size={16} color={C.accent} />
              {!isDefaultCustomerSelected && (
                <View style={{
                  position: "absolute", top: -2, right: -2,
                  width: 8, height: 8, borderRadius: 4, backgroundColor: C.green,
                  borderWidth: 1.5, borderColor: C.s2
                }} />
              )}
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowHoldsModal(true)}
              style={{
                width: 34, height: 34, borderRadius: 10, backgroundColor: C.s2,
                borderWidth: 1, borderColor: heldSales.length > 0 ? C.accent : C.border,
                alignItems: "center", justifyContent: "center",
                position: "relative"
              }}>
              <History size={16} color={heldSales.length > 0 ? C.accent : C.muted} />
              {heldSales.length > 0 && (
                <View style={{
                  position: "absolute", top: -2, right: -2,
                  width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent,
                  borderWidth: 1.5, borderColor: C.s2
                }} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Row 2: shift status + VAT label + queue badge */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => { setShiftModalType(currentShift ? "CLOSE" : "OPEN"); setShowShiftModal(true); }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: currentShift ? C.green : "#fbbf24",
              shadowColor: currentShift ? C.green : "#fbbf24", shadowOpacity: 0.7,
              shadowRadius: 4, shadowOffset: { width: 0, height: 0 }
            }} />
            <Text style={{ color: "rgba(232,237,245,0.6)", fontSize: 11, fontWeight: "600" }}>
              {currentShift ? "Shift active" : "Shift closed"}
            </Text>
            <Clock size={10} color={C.muted} />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: C.muted, fontSize: 9, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {taxInclusive ? "VAT incl." : "VAT excl."}
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: 5,
              backgroundColor: isSyncing ? C.accent : C.s2, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4,
              borderWidth: 1, borderColor: isSyncing ? C.accent : C.border
            }}>
              {isSyncing ? <ActivityIndicator size="small" color="#000" style={{ transform: [{ scale: 0.6 }] }} /> : <CloudUpload size={9} color={C.accent} />}
              <Text style={{ color: isSyncing ? "#000" : C.muted, fontSize: 9, fontWeight: "700" }}>
                {isSyncing ? "Syncing..." : (queueCount ? `${queueCount} queued` : "Synced")}
              </Text>
            </View>
          </View>
        </View>

        {/* Search + scan */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          <View style={{
            flex: 1, flexDirection: "row", alignItems: "center", gap: 8,
            backgroundColor: C.s2, borderWidth: 1, borderColor: C.border,
            borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10
          }}>
            <Search size={14} color={C.muted} />
            <TextInput
              style={{ flex: 1, color: C.text, fontSize: 14 }}
              placeholder="Search products…"
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View style={{
            width: 44, height: 44, borderRadius: 12, backgroundColor: C.s2,
            borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center"
          }}>
            <ScanLine size={18} color={C.accent} />
          </View>
        </View>

        {/* Category pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 6 }} contentContainerStyle={{ gap: 5 }}>
          {categories.map((cat: string) => (
            <TouchableOpacity key={cat} onPress={() => setSelectedCategory(cat)}
              style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                backgroundColor: selectedCategory === cat ? C.accent : C.s2,
                borderWidth: 1, borderColor: selectedCategory === cat ? C.accent : C.border
              }}>
              <Text style={{
                fontSize: 9, fontWeight: "700",
                color: selectedCategory === cat ? "#000" : C.muted
              }}>
                {cat === "All" ? "All" : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Info row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
          <Text style={{ color: C.muted, fontSize: 9, fontWeight: "600" }}>
            {filteredProducts.length} item{filteredProducts.length !== 1 ? "s" : ""}
          </Text>
          <Text style={{ color: C.muted, fontSize: 9, fontWeight: "600" }}>
            {cashierName}
          </Text>
        </View>
      </View>

      {/* ── PRODUCT GRID ───────────────────────────────────────────────────── */}
      <View style={{ flex: 1, paddingHorizontal: 12 }}>
        {loadingProducts ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={C.accent} />
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <View style={{
              width: 64, height: 64, borderRadius: 20, backgroundColor: C.s2,
              alignItems: "center", justifyContent: "center", marginBottom: 12,
              borderWidth: 1, borderColor: C.border
            }}>
              <Tag size={28} color={C.muted} />
            </View>
            <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2 }}>
              No products found
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: "space-between" }}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item: any) => item.id.toString()}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
            renderItem={({ item, index }: { item: any; index: number }) => {
              const inCartItem = cart.find((c: CartItem) => c.productId === item.id);
              const inCart = !!inCartItem;
              const stockLow = item.isTracked && Number(item.stockLevel || 0) <= 3;
              const outOfStock = item.isTracked && Number(item.stockLevel || 0) === 0;
              const { color, emoji } = getProductMeta(item, index);

              const toTitleCase = (str: string) =>
                str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

              return (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => !outOfStock && addToCart(item)}
                  style={{ width: "49%", marginBottom: 8, opacity: outOfStock ? 0.35 : 1 }}
                >
                  <View style={{
                    borderRadius: 16, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10,
                    backgroundColor: inCart ? C.s2 : C.s1,
                    borderWidth: inCart ? 1.5 : 1,
                    borderColor: inCart ? color : C.border,
                    overflow: "hidden",
                    shadowColor: inCart ? color : "#000",
                    shadowOpacity: inCart ? 0.28 : 0.08,
                    shadowRadius: inCart ? 10 : 4,
                    shadowOffset: { width: 0, height: inCart ? 4 : 1 },
                    elevation: inCart ? 6 : 1,
                  }}>
                    {/* Corner tint */}
                    <View style={{
                      position: "absolute", top: 0, right: 0,
                      width: 48, height: 48, borderTopRightRadius: 16,
                      backgroundColor: color, opacity: 0.07,
                    }} />

                    {/* Qty badge */}
                    {inCart && (
                      <View style={{
                        position: "absolute", top: -4, right: -4, zIndex: 2,
                        minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 5,
                        backgroundColor: color, alignItems: "center", justifyContent: "center",
                        shadowColor: color, shadowOpacity: 0.6, shadowRadius: 6,
                        shadowOffset: { width: 0, height: 0 },
                      }}>
                        <Text style={{ color: "#000", fontSize: 10, fontWeight: "900" }}>
                          {inCartItem!.quantity}
                        </Text>
                      </View>
                    )}

                    {/* Top row: emoji + stock badge */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <Text style={{ fontSize: 22, lineHeight: 26 }}>{emoji}</Text>
                      {item.isTracked && (
                        <View style={{
                          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                          backgroundColor: outOfStock ? "rgba(255,71,87,0.14)" : stockLow ? "rgba(251,191,36,0.12)" : "rgba(0,208,132,0.1)",
                          borderWidth: 1,
                          borderColor: outOfStock ? "rgba(255,71,87,0.3)" : stockLow ? "rgba(251,191,36,0.25)" : "rgba(0,208,132,0.22)",
                        }}>
                          <Text style={{ fontSize: 8, fontWeight: "800", color: outOfStock ? C.red : stockLow ? "#fbbf24" : C.green }}>
                            {outOfStock ? "OUT" : `${Number(item.stockLevel || 0)} left`}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Product name — 2 lines so nothing gets cut */}
                    <Text style={{
                      color: inCart ? C.text : "rgba(232,237,245,0.85)",
                      fontSize: 12, fontWeight: "700", lineHeight: 16, marginBottom: 6
                    }} numberOfLines={2}>
                      {toTitleCase(item.name)}
                    </Text>

                    {/* Bottom row: price + ± controls */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ color, fontSize: 15, fontWeight: "900", letterSpacing: -0.5 }}>
                        {fmt(Number(item.price))}
                      </Text>
                      {inCart ? (
                        <View style={{
                          flexDirection: "row", alignItems: "center",
                          backgroundColor: `${color}20`, borderRadius: 8, overflow: "hidden",
                          borderWidth: 1, borderColor: `${color}40`
                        }}>
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation?.(); inCartItem!.quantity > 1 ? updateQuantity(item.id, -1) : removeFromCart(item.id); }}
                            style={{ width: 26, height: 24, alignItems: "center", justifyContent: "center" }}>
                            <Minus size={11} color={color} />
                          </TouchableOpacity>
                          <Text style={{ color: C.text, fontSize: 11, fontWeight: "800", minWidth: 16, textAlign: "center" }}>
                            {inCartItem!.quantity}
                          </Text>
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation?.(); updateQuantity(item.id, 1); }}
                            style={{ width: 26, height: 24, alignItems: "center", justifyContent: "center" }}>
                            <Plus size={11} color={color} />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{
                          width: 26, height: 26, borderRadius: 8,
                          backgroundColor: `${color}15`, borderWidth: 1, borderColor: `${color}30`,
                          alignItems: "center", justifyContent: "center"
                        }}>
                          <Plus size={12} color={color} />
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      {/* ── FLOATING CART BAR ──────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 18, paddingTop: 6 }}>

        {/* Holds pill removed as requested */}

        <TouchableOpacity activeOpacity={0.9} disabled={cart.length === 0} onPress={() => setShowCart(true)}>
          <LinearGradient
            colors={cart.length === 0 ? [C.s2, C.s1] : [C.accent, C.accent2]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16,
              borderWidth: 1, borderColor: cart.length === 0 ? C.border : "transparent",
              shadowColor: cart.length === 0 ? "#000" : C.accent,
              shadowOpacity: cart.length === 0 ? 0 : 0.3, shadowRadius: 14,
              shadowOffset: { width: 0, height: 5 }
            }}>

            {/* Single row: icon + label + total — no item list */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 10,
                  backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center",
                  position: "relative"
                }}>
                  <ShoppingCart size={16} color={cart.length === 0 ? C.muted : "#000"} />
                  {cart.length > 0 && (
                    <View style={{
                      position: "absolute", top: -5, right: -5,
                      backgroundColor: "#000", borderRadius: 8, minWidth: 16, height: 16,
                      alignItems: "center", justifyContent: "center", paddingHorizontal: 3
                    }}>
                      <Text style={{ color: C.accent, fontSize: 8, fontWeight: "900" }}>
                        {cartItemCount}
                      </Text>
                    </View>
                  )}
                </View>
                <View>
                  <Text style={{ color: cart.length === 0 ? C.muted : "#000", fontSize: 13, fontWeight: "800" }}>
                    {cart.length === 0 ? "Cart is empty" : `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} · Tap to checkout`}
                  </Text>
                  {cart.length === 0 && (
                    <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Tap products to add</Text>
                  )}
                  {cart.length > 0 && orderDiscount > 0 && (
                    <Text style={{ color: "rgba(0,0,0,0.55)", fontSize: 10, marginTop: 1 }}>
                      🏷️ −{fmt(orderDiscount)} discount applied
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: cart.length === 0 ? C.muted : "#000", fontSize: 19, fontWeight: "900", letterSpacing: -0.5 }}>
                  {fmt(total)}
                </Text>
                {cart.length > 0 && taxAmount > 0 && (
                  <Text style={{ color: "rgba(0,0,0,0.5)", fontSize: 9, marginTop: 1 }}>
                    sub {fmt(subtotal)} · tax {fmt(taxAmount)}
                  </Text>
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ── CART MODAL ─────────────────────────────────────────────────────── */}
      <Modal visible={showCart} transparent animationType="slide" onRequestClose={() => setShowCart(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: C.s1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
            borderTopWidth: 1, borderColor: C.border, padding: 16, paddingBottom: 16, maxHeight: "88%", flex: 1
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <View>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>Cart</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
                  {cart.length === 0 ? "No items added yet" : `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} ready to sell`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCart(false)}
                style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: C.s2,
                  borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center"
                }}>
                <X size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {cart.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 48 }}>
                  <View style={{
                    width: 56, height: 56, borderRadius: 18, backgroundColor: C.s2,
                    borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 12
                  }}>
                    <ShoppingCart size={24} color={C.muted} />
                  </View>
                  <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2 }}>
                    Start adding products
                  </Text>
                </View>
              ) : cart.map((item: CartItem, idx: number) => {
                const { color } = getProductMeta(item, idx);
                return (
                  <View key={item.productId} style={{
                    marginBottom: 8, backgroundColor: C.s2,
                    padding: 10, borderRadius: 14, borderWidth: 1, borderColor: C.border
                  }}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                          {fmt(item.price)} each
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeFromCart(item.productId)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Trash2 size={15} color={C.red} />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <View style={{
                        flexDirection: "row", alignItems: "center",
                        backgroundColor: `${color}18`, borderRadius: 10, overflow: "hidden",
                        borderWidth: 1, borderColor: `${color}30`
                      }}>
                        <TouchableOpacity
                          onPress={() => item.quantity > 1 ? updateQuantity(item.productId, -1) : removeFromCart(item.productId)}
                          style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
                          <Minus size={12} color={color} />
                        </TouchableOpacity>
                        <Text style={{ color: C.text, fontSize: 15, fontWeight: "800", marginHorizontal: 12, minWidth: 20, textAlign: "center" }}>
                          {item.quantity}
                        </Text>
                        <TouchableOpacity
                          onPress={() => updateQuantity(item.productId, 1)}
                          style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
                          <Plus size={12} color={color} />
                        </TouchableOpacity>
                      </View>
                      <Text style={{ color, fontSize: 16, fontWeight: "800" }}>
                        {fmt(item.price * item.quantity)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderColor: C.border }}>
              {/* Discount row */}
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 8 }}>
                <View style={{
                  flex: 1, backgroundColor: C.s2, borderWidth: 1, borderColor: C.border,
                  borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2,
                  flexDirection: "row", alignItems: "center", gap: 8
                }}>
                  <Tag size={13} color={C.muted} />
                  <TextInput
                    style={{ flex: 1, color: C.text, fontSize: 14, paddingVertical: 10 }}
                    placeholder="Order discount…"
                    placeholderTextColor={C.muted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => { Keyboard.dismiss(); handleDiscountSubmit(); }}
                    onBlur={handleDiscountSubmit}
                    value={orderDiscountInput}
                    onChangeText={handleOrderDiscountChange}
                  />
                </View>
                <TouchableOpacity onPress={handleClearCart} disabled={cart.length === 0}
                  style={{
                    width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center",
                    backgroundColor: C.s2, borderWidth: 1, borderColor: C.border
                  }}>
                  <Trash2 size={17} color={cart.length === 0 ? C.muted : C.red} />
                </TouchableOpacity>
              </View>

              {/* Totals */}
              <View style={{
                backgroundColor: C.s2, borderRadius: 16, padding: 14,
                marginBottom: 14, borderWidth: 1, borderColor: C.border
              }}>
                {[
                  { label: "Subtotal", value: fmt(subtotal), color: C.text },
                  { label: "Tax", value: fmt(taxAmount), color: C.text },
                  ...(orderDiscount > 0 ? [{ label: "Discount", value: `-${fmt(orderDiscount)}`, color: C.green }] : []),
                ].map(row => (
                  <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ color: C.muted, fontSize: 13 }}>{row.label}</Text>
                    <Text style={{ color: row.color, fontSize: 13, fontWeight: "600" }}>{row.value}</Text>
                  </View>
                ))}
                <View style={{ height: 1, backgroundColor: C.border, marginVertical: 8 }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Total Due
                  </Text>
                  <Text style={{ color: C.accent, fontSize: 24, fontWeight: "900" }}>
                    {fmt(total)}
                  </Text>
                </View>
              </View>

              {/* Park / Holds */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                <TouchableOpacity activeOpacity={0.85} disabled={cart.length === 0 || isParking} onPress={handleParkSale}
                  style={{
                    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                    paddingVertical: 10, borderRadius: 14, borderWidth: 1,
                    borderColor: cart.length === 0 || isParking ? C.border : `${C.accent}50`,
                    backgroundColor: cart.length === 0 || isParking ? C.s2 : `${C.accent}12`
                  }}>
                  {isParking ? (
                    <ActivityIndicator size="small" color={C.accent} />
                  ) : (
                    <>
                      <Download size={14} color={cart.length === 0 ? C.muted : C.accent} />
                      <Text style={{ marginLeft: 6, fontSize: 10, fontWeight: "800", color: cart.length === 0 ? C.muted : C.accent }}>
                        Park Sale
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} disabled={heldSales.length === 0}
                  onPress={() => setShowHoldsModal(true)}
                  style={{
                    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
                    paddingVertical: 10, borderRadius: 14, borderWidth: 1,
                    borderColor: heldSales.length === 0 ? C.border : C.border,
                    backgroundColor: heldSales.length === 0 ? C.s2 : C.s3
                  }}>
                  <History size={14} color={heldSales.length === 0 ? C.muted : C.text} />
                  <Text style={{ marginLeft: 6, fontSize: 10, fontWeight: "800", color: heldSales.length === 0 ? C.muted : C.text }}>
                    Holds ({heldSales.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Checkout CTA */}
              <TouchableOpacity activeOpacity={0.88} disabled={cart.length === 0 || isSubmitting}
                onPress={() => { setShowCart(false); handleCheckout(); }}>
                <LinearGradient
                  colors={cart.length === 0 ? [C.s2, C.s1] : [C.accent, C.accent2]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 20, height: 58, paddingHorizontal: 18,
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
                    borderWidth: 1, borderColor: cart.length === 0 ? C.border : "transparent"
                  }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center"
                    }}>
                      <ShoppingCart size={16} color={cart.length === 0 ? C.muted : "#000"} />
                    </View>
                    <View>
                      <Text style={{ color: cart.length === 0 ? C.muted : "#000", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1.2 }}>
                        Checkout
                      </Text>
                      <Text style={{ color: cart.length === 0 ? C.muted : "rgba(0,0,0,0.55)", fontSize: 10, marginTop: 2 }}>
                        {cart.length === 0 ? "Add items first" : `${cartItemCount} item${cartItemCount !== 1 ? "s" : ""} · ready to pay`}
                      </Text>
                    </View>
                  </View>
                  {isSubmitting
                    ? <ActivityIndicator color="#000" size="small" />
                    : <Text style={{ color: cart.length === 0 ? C.muted : "#000", fontSize: 18, fontWeight: "900" }}>
                      {fmt(total)}
                    </Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── HOLDS MODAL ────────────────────────────────────────────────────── */}
      <Modal visible={showHoldsModal} transparent animationType="slide" onRequestClose={() => setShowHoldsModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: C.s1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
            borderTopWidth: 1, borderColor: C.border, padding: 24, maxHeight: "75%"
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>Parked Sales</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>Resume any held transaction</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHoldsModal(false)}
                style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: C.s2,
                  borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center"
                }}>
                <X size={16} color={C.text} />
              </TouchableOpacity>
            </View>
            {heldSales.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 48 }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 18, backgroundColor: C.s2,
                  borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center", marginBottom: 12
                }}>
                  <History size={24} color={C.muted} />
                </View>
                <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 2 }}>
                  No parked sales
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {heldSales.map((hold: HeldSale) => (
                  <TouchableOpacity key={String(hold.id)} activeOpacity={0.85}
                    onPress={() => handleResumeHold(hold)}
                    style={{
                      marginBottom: 10, backgroundColor: C.s2, padding: 16, borderRadius: 18,
                      borderWidth: 1, borderColor: C.border,
                      flexDirection: "row", alignItems: "center", justifyContent: "space-between"
                    }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 12 }}>
                      <View style={{
                        width: 42, height: 42, borderRadius: 14,
                        backgroundColor: `${C.accent}18`, alignItems: "center",
                        justifyContent: "center", marginRight: 12,
                        borderWidth: 1, borderColor: `${C.accent}30`
                      }}>
                        <ShoppingCart size={17} color={C.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.text, fontSize: 14, fontWeight: "700" }} numberOfLines={1}>
                          {hold.holdName}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 11, marginTop: 3 }}>
                          {new Date(hold.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                          {" · "}{hold.cartData.length} item{hold.cartData.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: C.accent, fontSize: 16, fontWeight: "800" }}>
                        {fmt(hold.total)}
                      </Text>
                      <Text style={{ color: C.muted, fontSize: 10, marginTop: 3 }}>Tap to resume</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── CHECKOUT MODAL ─────────────────────────────────────────────────── */}
      <Modal visible={showCheckout} transparent animationType="slide" onRequestClose={() => setShowCheckout(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: C.s1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
            borderTopWidth: 1, borderColor: C.border, maxHeight: "92%", paddingBottom: 36, flex: 1
          }}>
            <View style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              padding: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.border
            }}>
              <View>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>Checkout</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {cartItemCount} item{cartItemCount !== 1 ? "s" : ""} · {selectedCustomer?.name || "No customer"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCheckout(false)}
                style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: C.s2,
                  borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center"
                }}>
                <X size={16} color={C.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}
              contentContainerStyle={{ padding: 18, paddingTop: 12, paddingBottom: 8 }}>
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Order Summary
              </Text>
              <View style={{
                backgroundColor: C.s2, borderRadius: 16, borderWidth: 1,
                borderColor: C.border, overflow: "hidden", marginBottom: 14
              }}>
                {cart.map((item: CartItem, idx: number) => {
                  const lineTotal = item.price * item.quantity - item.discountAmount;
                  const isLast = idx === cart.length - 1;
                  return (
                    <View key={item.productId} style={{
                      flexDirection: "row", alignItems: "center",
                      paddingHorizontal: 12, paddingVertical: 8,
                      borderBottomWidth: isLast ? 0 : 1, borderBottomColor: C.border
                    }}>
                      <View style={{
                        width: 28, height: 28, borderRadius: 8,
                        backgroundColor: C.s3, borderWidth: 1, borderColor: C.border,
                        alignItems: "center", justifyContent: "center", marginRight: 12
                      }}>
                        <Text style={{ color: C.accent, fontSize: 11, fontWeight: "900" }}>{item.quantity}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: C.text, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{item.name}</Text>
                        <Text style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>
                          {fmt(item.price)} each
                          {item.discountAmount > 0 ? `  ·  −${fmt(item.discountAmount)} disc` : ""}
                        </Text>
                      </View>
                      <Text style={{ color: C.accent, fontSize: 14, fontWeight: "800", letterSpacing: -0.3 }}>
                        {fmt(lineTotal)}
                      </Text>
                    </View>
                  );
                })}

                <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 10 }}>
                  {[
                    { label: "Subtotal", value: fmt(subtotal) },
                    { label: "Tax", value: fmt(taxAmount) },
                    ...(orderDiscount > 0 ? [{ label: "Discount", value: `-${fmt(orderDiscount)}`, accent: C.green }] : []),
                  ].map(row => (
                    <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                      <Text style={{ color: C.muted, fontSize: 12 }}>{row.label}</Text>
                      <Text style={{ color: (row as any).accent || C.text, fontSize: 12, fontWeight: "600" }}>{row.value}</Text>
                    </View>
                  ))}
                  <View style={{ height: 1, backgroundColor: C.border, marginVertical: 8 }} />
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: C.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      Total Due
                    </Text>
                    <Text style={{ color: C.accent, fontSize: 18, fontWeight: "900", letterSpacing: -0.5 }}>
                      {fmt(total)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                Payment Method
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {[
                  { key: "CASH", label: "Cash", sub: "Collect & give change", Icon: Banknote },
                  { key: "CARD", label: "Card", sub: "POS / mobile money", Icon: CreditCard },
                ].map(({ key, label, sub, Icon }) => (
                  <TouchableOpacity key={key} onPress={() => setPaymentMethod(key)}
                    style={{
                      flex: 1, height: 56, borderRadius: 14, flexDirection: "row",
                      alignItems: "center", paddingHorizontal: 14, gap: 10,
                      borderWidth: paymentMethod === key ? 1.5 : 1,
                      borderColor: paymentMethod === key ? C.accent : C.border,
                      backgroundColor: paymentMethod === key ? `${C.accent}12` : C.s2
                    }}>
                    <Icon size={20} color={paymentMethod === key ? C.accent : C.muted} />
                    <View>
                      <Text style={{ color: paymentMethod === key ? C.accent : C.text, fontSize: 13, fontWeight: "700" }}>{label}</Text>
                      <Text style={{ color: C.muted, fontSize: 9, marginTop: 1 }}>{sub}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Currency Selector */}
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                Currency
              </Text>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {[
                  { code: "USD", exchangeRate: 1, symbol: "$" },
                  ...(currencies || []).filter((c: any) => c.code !== "USD")
                ].map((cur: any) => {
                  const isActive = selectedCurrency === cur.code;
                  return (
                    <TouchableOpacity key={cur.code} onPress={() => setSelectedCurrency(cur.code)}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                        borderWidth: isActive ? 1.5 : 1,
                        borderColor: isActive ? C.accent : C.border,
                        backgroundColor: isActive ? `${C.accent}14` : C.s2
                      }}>
                      <Text style={{ color: isActive ? C.accent : C.text, fontWeight: "700", fontSize: 13 }}>
                        {cur.code}
                      </Text>
                      {cur.code !== "USD" && (
                        <Text style={{ color: C.muted, fontSize: 9, marginTop: 1 }}>{`@${Number(cur.exchangeRate).toFixed(2)}`}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {selectedCurrency !== "USD" && (() => {
                const activeCur = (currencies || []).find((c: any) => c.code === selectedCurrency);
                const localTotal = activeCur ? total * Number(activeCur.exchangeRate) : total;
                return (
                  <View style={{
                    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
                    backgroundColor: `${C.accent}10`, borderRadius: 12, padding: 12, borderWidth: 1,
                    borderColor: `${C.accent}30`, marginBottom: 14
                  }}>
                    <Text style={{ color: C.muted, fontSize: 12 }}>Total in {selectedCurrency}</Text>
                    <Text style={{ color: C.accent, fontSize: 18, fontWeight: "900" }}>
                      {`${selectedCurrency} ${localTotal.toFixed(2)}`}
                    </Text>
                  </View>
                );
              })()}

              {paymentMethod === "CASH" && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
                    Amount Received
                  </Text>
                  <View style={{
                    flexDirection: "row", alignItems: "center",
                    backgroundColor: C.s2, borderWidth: 1, borderColor: C.border,
                    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 4
                  }}>
                    <Text style={{ color: C.muted, fontSize: 20, marginRight: 6, fontWeight: "300" }}>{currencyInfo.symbol}</Text>
                    <TextInput
                      style={{ flex: 1, color: C.text, fontSize: 26, fontWeight: "800", paddingVertical: 10 }}
                      placeholder={(total * currencyInfo.rate).toFixed(2)}
                      placeholderTextColor={C.muted}
                      value={paidAmount}
                      onChangeText={setPaidAmount}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                    />
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingHorizontal: 4 }}>
                    <Text style={{ color: C.muted, fontSize: 12 }}>Due: {fmt(total)}</Text>
                    {parseFloat(paidAmount || "0") >= (total * currencyInfo.rate) && (
                      <Text style={{ color: C.green, fontSize: 13, fontWeight: "700" }}>
                        Change: {fmt((parseFloat(paidAmount || "0") / currencyInfo.rate) - total)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
              <TouchableOpacity activeOpacity={0.85} disabled={isSubmitting} onPress={processOrder}>
                <LinearGradient colors={[C.accent, C.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 20, height: 58, paddingHorizontal: 18,
                    flexDirection: "row", alignItems: "center", justifyContent: "space-between"
                  }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <View style={{
                      width: 36, height: 36, borderRadius: 10,
                      backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center"
                    }}>
                      {isSubmitting
                        ? <ActivityIndicator size="small" color="#000" />
                        : <CheckCircle2 size={18} color="#000" />}
                    </View>
                    <View>
                      <Text style={{ color: "#000", fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8 }}>
                        {isSubmitting ? "Processing…" : "Confirm Payment"}
                      </Text>
                      <Text style={{ color: "rgba(0,0,0,0.55)", fontSize: 10, marginTop: 2 }}>
                        {paymentMethod === "CASH" ? "Cash" : "Card"} · {selectedCustomer?.name || "Guest"}
                      </Text>
                    </View>
                  </View>
                  {!isSubmitting && (
                    <Text style={{ color: "#000", fontSize: 17, fontWeight: "900" }}>
                      {fmt(total)}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── CUSTOMER PICKER MODAL ──────────────────────────────────────────── */}
      <Modal visible={showCustomerPicker} transparent animationType="slide" onRequestClose={() => setShowCustomerPicker(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: C.s1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
            borderTopWidth: 1, borderColor: C.border, padding: 24, maxHeight: "70%"
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}
                style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: C.s2,
                  borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center"
                }}>
                <X size={16} color={C.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={resolvedCustomers}
              keyExtractor={(item: any) => item.id.toString()}
              renderItem={({ item }: { item: any }) => {
                const isSelected = selectedCustomerId === item.id;
                const isDefault = item.id === defaultCustomerId;
                return (
                  <TouchableOpacity
                    onPress={() => { setSelectedCustomerId(item.id); setShowCustomerPicker(false); }}
                    style={{
                      padding: 14, borderRadius: 16, marginBottom: 8,
                      flexDirection: "row", alignItems: "center", borderWidth: 1,
                      borderColor: isSelected ? C.accent : C.border,
                      backgroundColor: isSelected ? `${C.accent}0f` : C.s2
                    }}>
                    <View style={{
                      width: 42, height: 42, borderRadius: 14, backgroundColor: C.s3,
                      borderWidth: 1, borderColor: C.border,
                      alignItems: "center", justifyContent: "center", marginRight: 14
                    }}>
                      <User size={18} color={isSelected ? C.accent : C.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: C.text, fontWeight: "700", fontSize: 14 }}>{item.name}</Text>
                        {isDefault && (
                          <View style={{
                            paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5,
                            backgroundColor: `${C.accent}18`, borderWidth: 1, borderColor: `${C.accent}35`
                          }}>
                            <Text style={{ color: C.accent, fontSize: 8, fontWeight: "800", textTransform: "uppercase" }}>Default</Text>
                          </View>
                        )}
                      </View>
                      {item.phone ? (
                        <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{item.phone}</Text>
                      ) : null}
                    </View>
                    {isSelected && <CheckCircle2 size={20} color={C.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* ── SUCCESS MODAL ──────────────────────────────────────────────────── */}
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => {
          // Block hardware back-dismiss when silent or auto-print is active
          if (!printerConfig.silentPrint && !printerConfig.autoPrint) setShowSuccess(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{
            backgroundColor: C.s1, borderRadius: 32, borderWidth: 1,
            borderColor: C.border, width: "100%", maxWidth: 380, overflow: "hidden"
          }}>
            <LinearGradient colors={[`${C.accent}18`, "transparent"]} style={{ padding: 32, alignItems: "center" }}>
              <View style={{
                width: 80, height: 80, borderRadius: 40,
                backgroundColor: `${C.green}18`, borderWidth: 1.5, borderColor: `${C.green}40`,
                alignItems: "center", justifyContent: "center", marginBottom: 16
              }}>
                <CheckCircle2 size={42} color={C.green} />
              </View>
              <Text style={{ color: C.text, fontSize: 26, fontWeight: "900", marginBottom: 6, letterSpacing: -0.3 }}>
                {lastInvoice?._offline ? "Saved Offline!" : "Sale Complete!"}
              </Text>
              <Text style={{ color: C.green, fontSize: 13, fontWeight: "600", marginBottom: 24, textAlign: "center" }}>
                {lastInvoice?._offline ? "Will sync automatically when back online." : "Transaction recorded successfully"}
              </Text>
              <View style={{
                width: "100%", backgroundColor: C.s2, borderRadius: 18,
                padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: C.muted, fontSize: 12 }}>
                    {lastInvoice?._offline ? "Queued Amount" : "Amount"}
                  </Text>
                  <Text style={{ color: C.accent, fontSize: 24, fontWeight: "900" }}>
                    {fmt(Number(lastInvoice?.total || 0))}
                  </Text>
                </View>
              </View>
              <View style={{ width: "100%", gap: 10, marginBottom: 20 }}>
                <TouchableOpacity activeOpacity={0.8} onPress={handlePrintStandard} disabled={isPrinting}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 10, paddingVertical: 14, borderRadius: 16,
                    backgroundColor: C.s2, borderWidth: 1, borderColor: C.border
                  }}>
                  <Printer size={18} color={C.accent} />
                  <Text style={{ color: C.text, fontWeight: "700" }}>Print Receipt</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.8} onPress={handlePrintThermal} disabled={isPrinting}
                  style={{
                    flexDirection: "row", alignItems: "center", justifyContent: "center",
                    gap: 10, paddingVertical: 14, borderRadius: 16,
                    backgroundColor: C.s2, borderWidth: 1, borderColor: C.border
                  }}>
                  <Bluetooth size={18} color={C.accent} />
                  <Text style={{ color: C.text, fontWeight: "700" }}>Bluetooth Thermal</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setShowSuccess(false)} style={{ width: "100%", borderRadius: 16, overflow: "hidden" }}>
                <LinearGradient colors={[C.accent, C.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 16, alignItems: "center" }}>
                  <Text style={{ color: "#000", fontWeight: "800", fontSize: 14, textTransform: "uppercase", letterSpacing: 1 }}>New Sale</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* ── SHIFT MODAL ────────────────────────────────────────────────────── */}
      <Modal visible={showShiftModal} transparent animationType="slide" onRequestClose={() => setShowShiftModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: C.s1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
            borderTopWidth: 1, borderColor: C.border, padding: 24, paddingBottom: 36
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>
                {shiftModalType === "OPEN" ? "Open Shift" : "Close Shift"}
              </Text>
              <TouchableOpacity onPress={() => setShowShiftModal(false)}
                style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: C.s2,
                  borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center"
                }}>
                <X size={16} color={C.text} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
              {shiftModalType === "OPEN" ? "Float / Opening Balance" : "Actual Counted Cash"}
            </Text>
            <TextInput
              style={{
                backgroundColor: C.s2, borderWidth: 1, borderColor: C.border,
                borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                color: C.text, fontSize: 18, fontWeight: "800"
              }}
              placeholder="0.00"
              placeholderTextColor={C.muted}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              value={shiftBalance}
              onChangeText={setShiftBalance}
            />
            <View style={{ height: 16 }} />
            <TouchableOpacity activeOpacity={0.88} onPress={shiftModalType === "OPEN" ? openShift : closeShift}>
              <LinearGradient
                colors={shiftModalType === "OPEN" ? ["#34d399", "#10b981"] : [C.red, "#dc2626"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 22, height: 64, paddingHorizontal: 22,
                  flexDirection: "row", alignItems: "center", justifyContent: "space-between"
                }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  {shiftModalType === "OPEN" ? <Play size={20} color="#000" /> : <Pause size={20} color="#fff" />}
                  <Text style={{
                    color: shiftModalType === "OPEN" ? "#000" : "#fff",
                    fontSize: 14, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.2
                  }}>
                    {shiftModalType === "OPEN" ? "Start Service" : "Close Shift"}
                  </Text>
                </View>
                <Text style={{
                  color: shiftModalType === "OPEN" ? "#000" : "rgba(255,255,255,0.9)",
                  fontWeight: "800", fontSize: 16
                }}>
                  ${(parseFloat(shiftBalance || "0") || 0).toFixed(2)}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => syncQueued(true)} disabled={!isOnline || queueCount === 0}
              style={{ marginTop: 14, alignItems: "center" }}>
              <Text style={{
                color: !isOnline || queueCount === 0 ? C.muted : "rgba(232,237,245,0.65)",
                fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.2
              }}>
                Sync queued now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── PRINTER SETTINGS MODAL ─────────────────────────────────────────── */}
      <Modal visible={showPrinterSettings} transparent animationType="slide" onRequestClose={() => setShowPrinterSettings(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: C.s1, borderTopLeftRadius: 32, borderTopRightRadius: 32,
            borderTopWidth: 1, borderColor: C.border, padding: 24, paddingBottom: 36
          }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <View>
                <Text style={{ color: C.text, fontSize: 22, fontWeight: "800" }}>Printer Settings</Text>
                <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Configure Bluetooth Hardware</Text>
              </View>
              <TouchableOpacity onPress={() => setShowPrinterSettings(false)}
                style={{
                  width: 38, height: 38, borderRadius: 12, backgroundColor: C.s2,
                  borderWidth: 1, borderColor: C.border, alignItems: "center", justifyContent: "center"
                }}>
                <X size={16} color={C.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '80%' }} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 10 }}>
                Device MAC Address (e.g. 00:11:22:33:44:55)
              </Text>
              <TextInput
                style={{
                  backgroundColor: C.s2, borderWidth: 1, borderColor: C.border,
                  borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                  color: C.text, fontSize: 16, fontWeight: "600",
                  textTransform: "uppercase", marginBottom: 20
                }}
                placeholder="Leave blank to use OS Dialog"
                placeholderTextColor={C.muted}
                autoCapitalize="characters"
                returnKeyType="done"
                value={tempPrinterAddress}
                onChangeText={setTempPrinterAddress}
              />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <View>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>Auto-Print</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Print receipt immediately after sale</Text>
                </View>
                <TouchableOpacity onPress={() => setTempAutoPrint(!tempAutoPrint)}>
                  {tempAutoPrint ? <ToggleRight size={32} color={C.green} /> : <ToggleLeft size={32} color={C.muted} />}
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <View>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>Show Success Modal</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Show ticket/print options after sale</Text>
                </View>
                <TouchableOpacity onPress={() => setTempAutoShowModal(!tempAutoShowModal)}>
                  {tempAutoShowModal ? <ToggleRight size={32} color={C.green} /> : <ToggleLeft size={32} color={C.muted} />}
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <View>
                  <Text style={{ color: C.text, fontSize: 16, fontWeight: "700" }}>Silent Print (System)</Text>
                  <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Bypass print dialog (if target specified)</Text>
                </View>
                <TouchableOpacity onPress={() => setTempSilentPrint(!tempSilentPrint)}>
                  {tempSilentPrint ? <ToggleRight size={32} color={C.green} /> : <ToggleLeft size={32} color={C.muted} />}
                </TouchableOpacity>
              </View>

              <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Terminal ID
              </Text>
              <TextInput
                style={{
                  backgroundColor: C.s2, borderWidth: 1, borderColor: C.border,
                  borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                  color: C.text, fontSize: 16, fontWeight: "600", marginBottom: 20
                }}
                placeholder="POS-01"
                placeholderTextColor={C.muted}
                returnKeyType="done"
                value={tempTerminalId}
                onChangeText={setTempTerminalId}
              />

              <Text style={{ color: C.muted, fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                Target System Printer URL/Name
              </Text>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                <TextInput
                  style={{
                    flex: 1, backgroundColor: C.s2, borderWidth: 1, borderColor: C.border,
                    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
                    color: C.text, fontSize: 16, fontWeight: "600"
                  }}
                  placeholder="OS Printer URL"
                  placeholderTextColor={C.muted}
                  returnKeyType="done"
                  value={tempTargetPrinter}
                  onChangeText={setTempTargetPrinter}
                />

                {Platform.OS !== 'web' && (
                  <TouchableOpacity onPress={handleSelectSystemPrinter} style={{
                    backgroundColor: C.s2, borderWidth: 1, borderColor: C.border,
                    borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 16
                  }}>
                    <MonitorSmartphone size={20} color={C.text} />
                  </TouchableOpacity>
                )}
              </View>

            </ScrollView>

            <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border, marginTop: 10 }}>
              <TouchableOpacity activeOpacity={0.88} onPress={() => {
                savePrinterConfig({
                  macAddress: tempPrinterAddress,
                  autoPrint: tempAutoPrint,
                  autoShowModal: tempAutoShowModal,
                  silentPrint: tempSilentPrint,
                  terminalId: tempTerminalId,
                  targetPrinter: tempTargetPrinter
                });
                setShowPrinterSettings(false);
              }}>
                <LinearGradient
                  colors={[C.accent, C.accent2]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 22, height: 56, paddingHorizontal: 22,
                    flexDirection: "row", alignItems: "center", justifyContent: "center"
                  }}>
                  <Text style={{
                    color: "#000",
                    fontSize: 14, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.2
                  }}>
                    Save Configuration
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MANAGER PIN MODAL ──────────────────────────────────────────────── */}
      {pendingOverride ? (
        <ManagerPinModal
          visible={!!pendingOverride}
          companyId={companyId}
          title={pendingOverride.type === "DISCOUNT" ? "Authorize Discount" : "Authorize Void"}
          description={pendingOverride.type === "DISCOUNT"
            ? "Manager PIN required for high discount"
            : "Manager PIN required to void cart"}
          onClose={() => {
            setPendingOverride(null);
            setOrderDiscountInput(orderDiscount === 0 ? "" : orderDiscount.toString());
          }}
          onAuthorized={() => {
            if (pendingOverride.type === "DISCOUNT") setOrderDiscount(pendingOverride.data);
            else { setCart([]); setOrderDiscount(0); setSelectedCustomerId(defaultCustomerId); }
            setPendingOverride(null);
          }}
        />
      ) : null}
    </View>
  );
}