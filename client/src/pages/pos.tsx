import { PosLayout } from "@/components/pos-layout";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useCurrencies } from "@/hooks/use-currencies";
import { useCompany } from "@/hooks/use-companies";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { useToast } from "@/hooks/use-toast";
import { useOffline } from "@/hooks/use-offline";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import {
    cacheShift, getCachedShift,
    addPendingShiftAction, getPendingShifts,
    addOfflineHold, getOfflineHolds, removeOfflineHold,
    setLastCacheTime,
    addPendingSale,
} from "@/lib/offline-db";
import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, UserPlus, Loader2, Package, Tag, Pause, Play, History, Calculator, Printer, CheckCircle2, XCircle, ChevronRight, Fullscreen, HelpCircle, User, Settings as SettingsIcon, LogOut, FileText, Receipt, Clock, LayoutGrid, ShoppingBag, Filter, WifiOff, Wifi, CloudUpload, AlertTriangle } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { POSReceipt } from "@/components/pos-receipt";
import { Receipt48 } from "@/components/pos/receipt-48";
import { ManagerOverride } from "@/components/pos/manager-override";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MySalesModal } from "@/components/pos/my-sales-modal";

interface CartItem {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    discountAmount: number; // Applied to this line
    taxRate: number;
    taxTypeId?: number | null;
    hsCode?: string;
}

import { useAuth } from "@/hooks/use-auth";

export default function POSPage() {
    const { user, logout } = useAuth();
    const queryClient = useQueryClient();
    // Use state so companyId is reactive — handles the case where selectedCompanyId
    // is set just before this component mounts (offline login race condition).
    const [companyId, setCompanyId] = useState<number>(
        () => parseInt(localStorage.getItem("selectedCompanyId") || "0")
    );
    useEffect(() => {
        if (companyId) return; // already have a valid id
        // Poll briefly in case offline login set it just after mount
        const t = setInterval(() => {
            const id = parseInt(localStorage.getItem("selectedCompanyId") || "0");
            if (id) { setCompanyId(id); clearInterval(t); }
        }, 100);
        setTimeout(() => clearInterval(t), 3000); // stop after 3s
        return () => clearInterval(t);
    }, [companyId]);
    const { data: company } = useCompany(companyId);
    const isCashier = (company as any)?.role === 'cashier';
    const { data: products, isLoading: isLoadingProducts } = useProducts(companyId);

    // Emergency fallback: if React Query returns nothing but we have a companyId,
    // read directly from IndexedDB. This handles edge cases where the query
    // completes but returns empty due to timing issues.
    const [cachedProductsFallback, setCachedProductsFallback] = useState<any[]>([]);
    const [cachedCompanyFallback, setCachedCompanyFallback] = useState<any>(null);
    const [cachedCustomersFallback, setCachedCustomersFallback] = useState<any[]>([]);
    useEffect(() => {
        if (!companyId) return;
        import('@/lib/offline-db').then(({ getCachedProducts, getCachedCompanySettings, getCachedCompaniesList, getCachedCustomers }) => {
            // Products
            getCachedProducts(companyId).then(cached => {
                if (cached && cached.length > 0) {
                    console.log(`[POS] Direct cache read: ${cached.length} products for company ${companyId}`);
                    setCachedProductsFallback(cached);
                }
            });
            // Company
            getCachedCompanySettings(companyId).then(async cached => {
                if (cached) { setCachedCompanyFallback(cached); return; }
                const list = await getCachedCompaniesList();
                const fromList = list?.find((c: any) => c.id === companyId || c.id === String(companyId));
                if (fromList) setCachedCompanyFallback(fromList);
            });
            // Customers
            getCachedCustomers(companyId).then(cached => {
                if (cached && cached.length > 0) {
                    console.log(`[POS] Direct cache read: ${cached.length} customers for company ${companyId}`);
                    setCachedCustomersFallback(cached);
                }
            });
        });
    }, [companyId]);
    const { data: customers } = useCustomers(companyId);
    const { data: currencies } = useCurrencies(companyId);
    const { taxTypes } = useTaxConfig(companyId);
    const createInvoice = useCreateInvoice(companyId);

    // Offline support
    const {
        isOnline,
        pendingSalesCount,
        syncStatus,
        syncProgress,
        triggerSync,
        refreshPendingCount,
        lastCacheTime,
        refreshCacheTime
    } = useOffline(companyId);

    // When we come back online (or first confirm online), refresh all POS data queries
    const prevIsOnlineRef = useRef<boolean | null>(null);
    useEffect(() => {
        const prev = prevIsOnlineRef.current;
        prevIsOnlineRef.current = isOnline;
        if (prev === false && isOnline && companyId) {
            // Invalidate using partial key prefixes that match the actual query keys
            queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
            queryClient.invalidateQueries({ queryKey: ['/api/companies/:companyId/products', companyId] });
            queryClient.invalidateQueries({ queryKey: ['/api/companies/:companyId/customers', companyId] });
            queryClient.invalidateQueries({ queryKey: ['/api/companies/:companyId/currencies', companyId] });
            queryClient.invalidateQueries({ queryKey: ['/api/tax/types', companyId] });
        }
    }, [isOnline, companyId, queryClient]);

    // Resolved data — hooks handle caching and fallback; direct IDB reads are emergency fallback
    const resolvedProducts = (products && products.length > 0) ? products : cachedProductsFallback;
    const resolvedCustomers = (customers && customers.length > 0) ? customers : cachedCustomersFallback;
    const resolvedCurrencies = currencies || [];
    const resolvedTaxTypes = taxTypes?.data || [];
    const resolvedCompany = company ?? cachedCompanyFallback;
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [orderDiscount, setOrderDiscount] = useState<number>(0);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastSuccessfulInvoice, setLastSuccessfulInvoice] = useState<any>(null);
    const [activeView, setActiveView] = useState<"products" | "cart">("products");
    const [paidAmount, setPaidAmount] = useState<string>("");
    const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>("USD");

    // Barcode scanner — use refs to avoid stale closure issues
    const barcodeBufferRef = useRef("");
    const lastCharTimeRef = useRef(0);
    const lastScannedProductRef = useRef<{ productId: number; time: number } | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [heldSales, setHeldSales] = useState<any[]>([]);
    const [isHoldsModalOpen, setIsHoldsModalOpen] = useState(false);
    const [currentShift, setCurrentShift] = useState<any>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftModalType, setShiftModalType] = useState<"OPEN" | "CLOSE">("OPEN");
    const [shiftBalance, setShiftBalance] = useState("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Credit/Debit Note modal
    const [isCreditNoteOpen, setIsCreditNoteOpen] = useState(false);
    const [cnSearchQuery, setCnSearchQuery] = useState("");
    const [cnSearchResults, setCnSearchResults] = useState<any[]>([]);
    const [cnSearching, setCnSearching] = useState(false);
    const [cnProcessing, setCnProcessing] = useState(false);
    const [cnType, setCnType] = useState<"credit" | "debit">("credit");

    // X/Z Report modal
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportType, setReportType] = useState<"x" | "z">("x");

    // Reprint receipts
    const [isReprintOpen, setIsReprintOpen] = useState(false);
    const [reprintList, setReprintList] = useState<any[]>([]);
    const [reprintListLoading, setReprintListLoading] = useState(false);
    const [reprintInvoice, setReprintInvoice] = useState<any>(null);
    const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
    const [posSettings, setPosSettings] = useState({
        printingEnabled: true,
        autoPrint: true,
        terminalId: "POS-T01",
        silentPrinting: false,
        printerName: localStorage.getItem("pos_printer_name") || "",
        printServerUrl: "http://localhost:12312",
        cashDrawerEnabled: false
    });

    // Default to "Walk-in Customer"
    const resetToDefaultCustomer = () => {
        if (resolvedCustomers && resolvedCustomers.length > 0) {
            const walkIn = resolvedCustomers.find((x: any) => x.name.toLowerCase().includes("walk-in") || x.name.toLowerCase().includes("guest"));
            setSelectedCustomerId(walkIn ? walkIn.id.toString() : "");
        } else {
            setSelectedCustomerId("");
        }
    };

    useEffect(() => {
        if (!selectedCustomerId && resolvedCustomers && resolvedCustomers.length > 0) {
            const walkIn = resolvedCustomers.find((x: any) => x.name.toLowerCase().includes("walk-in") || x.name.toLowerCase().includes("guest"));
            if (walkIn) {
                setSelectedCustomerId(walkIn.id.toString());
            }
        }
    }, [resolvedCustomers, selectedCustomerId]);

    // Manager Override State
    const [pendingOverride, setPendingOverride] = useState<{ 
        type: "DISCOUNT" | "VOID_CART" | "REMOVE_ITEM" | "PRICE_CHANGE" | "OPEN_DRAWER", 
        data: any 
    } | null>(null);

    // ─── POS Session Persistence ──────────────────────────────────────────
    // Load persisted state on mount
    useEffect(() => {
        if (!companyId) return;
        const prefix = `pos_session_${companyId}_`;

        try {
            const savedCart = localStorage.getItem(`${prefix}cart`);
            const savedCustomerId = localStorage.getItem(`${prefix}customerId`);
            const savedDiscount = localStorage.getItem(`${prefix}discount`);
            const savedCurrency = localStorage.getItem(`${prefix}currency`);
            const savedPaymentMethod = localStorage.getItem(`${prefix}paymentMethod`);

            if (savedCart) setCart(JSON.parse(savedCart));
            if (savedCustomerId) setSelectedCustomerId(savedCustomerId);
            if (savedDiscount) setOrderDiscount(parseFloat(savedDiscount));
            if (savedCurrency) setSelectedCurrencyCode(savedCurrency);
            if (savedPaymentMethod) setPaymentMethod(savedPaymentMethod);
        } catch (e) {
            console.error("[POS] Failed to load persisted session:", e);
        }
    }, [companyId]);

    // Save state on every change
    useEffect(() => {
        if (!companyId) return;
        const prefix = `pos_session_${companyId}_`;

        localStorage.setItem(`${prefix}cart`, JSON.stringify(cart));
        localStorage.setItem(`${prefix}customerId`, selectedCustomerId);
        localStorage.setItem(`${prefix}discount`, orderDiscount.toString());
        localStorage.setItem(`${prefix}currency`, selectedCurrencyCode);
        localStorage.setItem(`${prefix}paymentMethod`, paymentMethod);
    }, [companyId, cart, selectedCustomerId, orderDiscount, selectedCurrencyCode, paymentMethod]);

    const clearPersistedSession = () => {
        if (!companyId) return;
        const prefix = `pos_session_${companyId}_`;
        localStorage.removeItem(`${prefix}cart`);
        localStorage.removeItem(`${prefix}customerId`);
        localStorage.removeItem(`${prefix}discount`);
        localStorage.removeItem(`${prefix}currency`);
        localStorage.removeItem(`${prefix}paymentMethod`);
    };

    // Derived data
    const categories = useMemo(() => {
        if (!resolvedProducts || resolvedProducts.length === 0) return ["All"];
        const cats = new Set(resolvedProducts.map((p: any) => p.category || "Uncategorized"));
        return ["All", ...Array.from(cats)];
    }, [resolvedProducts]);

    const filteredProducts = useMemo(() => {
        if (!resolvedProducts || resolvedProducts.length === 0) return [];
        return resolvedProducts.filter((p: any) => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        }).sort(() => Math.random() - 0.5);
    }, [resolvedProducts, searchQuery, selectedCategory]);

    // ── Display limit: show first 40 items; show all when searching/filtering ──
    const INITIAL_LIMIT = 40;
    const pagedProducts = useMemo(
        () => searchQuery || selectedCategory !== "All"
            ? filteredProducts
            : filteredProducts.slice(0, INITIAL_LIMIT),
        [filteredProducts, searchQuery, selectedCategory]
    );
    // ─────────────────────────────────────────────────────────────────────────

    const currencyInfo = useMemo(() => {
        if (selectedCurrencyCode === "USD") return { symbol: "$", rate: 1 };
        const cur = (resolvedCurrencies || []).find((c: any) => c.code === selectedCurrencyCode);
        return {
            symbol: cur?.symbol || selectedCurrencyCode,
            rate: Number(cur?.exchangeRate || 1)
        };
    }, [selectedCurrencyCode, resolvedCurrencies]);

    const fmt = (val: number) => {
        const converted = val * currencyInfo.rate;
        return `${currencyInfo.symbol}${converted.toFixed(2)}`;
    };

    const taxInclusive = company?.vatEnabled ?? false;

    const { subtotal, taxAmount } = useMemo(() => {
        let sub = 0;
        let tax = 0;

        cart.forEach(item => {
            const lineTotal = (item.price * item.quantity) - item.discountAmount;
            const rate = item.taxRate / 100;

            if (taxInclusive) {
                // Price includes tax: Tax = Total - (Total / (1 + Rate))
                const taxPortion = lineTotal - (lineTotal / (1 + rate));
                const netPortion = lineTotal - taxPortion;
                sub += netPortion;
                tax += taxPortion;
            } else {
                // Price excludes tax: Tax = Total * Rate
                const taxPortion = lineTotal * rate;
                sub += lineTotal;
                tax += taxPortion;
            }
        });

        return { subtotal: sub, taxAmount: tax };
    }, [cart, taxInclusive]);

    const total = Math.max(0, subtotal + taxAmount - orderDiscount);

    // Handlers
    const addToCart = (product: any) => {
        // Strict Stock Check
        if (product && product.isTracked) {
            const inCart = cart.find(item => item.productId === product.id)?.quantity || 0;
            if (inCart >= Number(product.stockLevel || 0)) {
                toast({
                    title: "Out of Stock",
                    description: `Only ${product.stockLevel || 0} units available for ${product.name}`,
                    variant: "destructive"
                });
                return;
            }
        }

        setCart(prev => {
            const existing = prev.find(item => item.productId === product.id);
            if (existing) {
                return prev.map(item =>
                    item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }

            let taxRate = company?.vatRegistered ? Number(product.taxRate ?? 15) : 0;
            if (company?.vatRegistered && product.taxCategoryId && taxTypes.data) {
                const category = taxTypes.data.find((t: any) => t.id === product.taxCategoryId);
                if (category) taxRate = Number(category.rate);
            }

            return [...prev, {
                productId: product.id,
                name: product.name,
                price: Number(product.price),
                quantity: 1,
                discountAmount: 0,
                taxRate: taxRate,
                taxTypeId: product.taxTypeId,
                hsCode: product.hsCode
            }];
        });
    };

    const applyLineDiscount = (productId: number, amount: number) => {
        setCart(prev => prev.map(item =>
            item.productId === productId ? { ...item, discountAmount: amount } : item
        ));
    };

    // ─── Barcode Scanner (keyboard wedge / HID mode) ──────────────────────
    // Uses refs to avoid stale closures. Handles scanners up to 100ms/char.
    // Works even when search input is focused.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();
            const gap = now - lastCharTimeRef.current;
            const inInput = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
            const modalOpen = isCheckoutOpen || isShiftModalOpen || isHoldsModalOpen || isSettingsOpen || !!pendingOverride;

            // ── Keyboard shortcuts (only when not typing in an input and no modal) ──
            if (!inInput && !modalOpen) {
                switch (e.key) {
                    case 'F1':
                        e.preventDefault();
                        searchInputRef.current?.focus();
                        searchInputRef.current?.select();
                        return;
                    case 'F2':
                        e.preventDefault();
                        if (cart.length > 0) handleCheckout();
                        return;
                    case 'F3':
                        e.preventDefault();
                        if (cart.length > 0) holdOrder();
                        return;
                    case 'F4':
                        e.preventDefault();
                        handleClearCart();
                        return;
                    case 'Escape':
                        setSearchQuery("");
                        searchInputRef.current?.blur();
                        return;
                    case '+':
                    case '=':
                        e.preventDefault();
                        if (cart.length > 0) updateQuantity(cart[cart.length - 1].productId, 1);
                        return;
                    case '-':
                        e.preventDefault();
                        if (cart.length > 0) updateQuantity(cart[cart.length - 1].productId, -1);
                        return;
                }
            }

            // Escape closes checkout modal
            if (e.key === 'Escape' && isCheckoutOpen) {
                setIsCheckoutOpen(false);
                return;
            }

            // ── Barcode accumulation — chars arriving < 100ms apart are from a scanner ──
            if (gap > 100) {
                barcodeBufferRef.current = e.key === 'Enter' ? '' : e.key;
            } else {
                if (e.key === 'Enter') {
                    const barcode = barcodeBufferRef.current.trim();
                    barcodeBufferRef.current = '';
                    if (barcode.length < 2) return;

                    const found = resolvedProducts?.find(
                        (p: any) => p.barcode === barcode || p.sku === barcode
                    );
                    if (found) {
                        const prev = lastScannedProductRef.current;
                        if (prev && prev.productId === found.id && now - prev.time < 2000) {
                            updateQuantity(found.id, 1);
                        } else {
                            addToCart(found);
                            toast({ title: "✓ Scanned", description: found.name });
                        }
                        lastScannedProductRef.current = { productId: found.id, time: now };
                        if (searchQuery) setSearchQuery("");
                    } else {
                        setSearchQuery(barcode);
                        searchInputRef.current?.focus();
                        toast({ title: "Not found", description: `No product for: ${barcode}`, variant: "destructive" });
                    }
                } else if (e.key.length === 1) {
                    barcodeBufferRef.current += e.key;
                }
            }
            lastCharTimeRef.current = now;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [resolvedProducts, cart, isCheckoutOpen, isShiftModalOpen, isHoldsModalOpen, isSettingsOpen, pendingOverride, searchQuery]);

    // ─── Electron serial/USB barcode scanner ──────────────────────────────
    useEffect(() => {
        if (!window.electronAPI) return;
        const handler = (barcode: string) => {
            const trimmed = barcode.trim();
            if (!trimmed) return;
            const found = resolvedProducts?.find((p: any) => p.barcode === trimmed || p.sku === trimmed);
            if (found) {
                const now = Date.now();
                const prev = lastScannedProductRef.current;
                if (prev && prev.productId === found.id && now - prev.time < 2000) {
                    updateQuantity(found.id, 1);
                } else {
                    addToCart(found);
                    toast({ title: "✓ Scanned", description: found.name });
                }
                lastScannedProductRef.current = { productId: found.id, time: now };
            } else {
                setSearchQuery(trimmed);
                searchInputRef.current?.focus();
                toast({ title: "Not found", description: `No product for: ${trimmed}`, variant: "destructive" });
            }
        };
        window.electronAPI.onBarcodeScan(handler);
        return () => window.electronAPI?.offBarcodeScan?.(handler);
    }, [resolvedProducts]);

    // Pre-cache manager PIN hashes for offline verification (Electron only)
    useEffect(() => {
        if (!window.electronAPI || !isOnline || !companyId) return;
        apiFetch(`/api/companies/${companyId}/auth/manager-pin-hashes`)
            .then(res => res.ok ? res.json() : null)
            .then(hashes => {
                if (hashes && hashes.length > 0) {
                    window.electronAPI!.cacheManagerPins(companyId, hashes);
                }
            })
            .catch(() => { /* non-critical — silently ignore */ });
    }, [companyId, isOnline]);

    const updateQuantity = (productId: number, delta: number) => {
        const product = resolvedProducts?.find((p: any) => p.id === productId);
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = item.quantity + delta;
                if (newQty < 1) return item;

                // Stock Validation
                if (product?.isTracked && newQty > Number(product.stockLevel)) {
                    toast({
                        title: "Limit Reached",
                        description: `Maximum stock for ${product.name} is ${product.stockLevel}`,
                        variant: "destructive"
                    });
                    return item;
                }

                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (productId: number) => {
        const settings = company?.posSettings as any;
        if (settings?.requireOverrideForDelete) {
            setPendingOverride({ type: "REMOVE_ITEM", data: productId });
        } else {
            setCart(prev => prev.filter(item => item.productId !== productId));
        }
    };

    const updatePrice = (productId: number, newPrice: number) => {
        const settings = company?.posSettings as any;
        if (settings?.requireOverrideForPriceChange) {
            setPendingOverride({ type: "PRICE_CHANGE", data: { productId, price: newPrice } });
        } else {
            setCart(prev => prev.map(item =>
                item.productId === productId ? { ...item, price: newPrice } : item
            ));
        }
    };

    const handleOpenDrawer = () => {
        const settings = company?.posSettings as any;
        if (settings?.requireOverrideForOpenDrawer) {
            setPendingOverride({ type: "OPEN_DRAWER", data: null });
        } else {
            toast({ title: "Drawer Opened", description: "Cash drawer opened successfully" });
            // triggerOpenDrawer();
        }
    };

    const fetchShift = async () => {
        if (isOnline) {
            try {
                const res = await apiFetch(`/api/pos/shifts/current?companyId=${companyId}`);
                if (res.ok) {
                    const shiftData = await res.json();
                    setCurrentShift(shiftData);
                    if (companyId) await cacheShift(companyId, shiftData);
                    return;
                }
                // 401 = offline auth session — fall through to cache
            } catch (e) {
                console.error("Failed to fetch shift from API", e);
            }
        }
        // Offline or auth-offline fallback
        if (companyId) {
            const cached = await getCachedShift(companyId);
            if (cached) setCurrentShift(cached);
        }
    };

    const fetchHeldSales = async () => {
        let serverHolds: any[] = [];
        let offlineHolds: any[] = [];

        if (isOnline) {
            try {
                const res = await apiFetch(`/api/pos/holds?companyId=${companyId}`);
                if (res.ok) serverHolds = await res.json();
                // 401 = offline auth session — skip server holds, use local only
            } catch (e) {
                console.error("Failed to fetch holds from API", e);
            }
        }

        if (companyId) {
            const local = await getOfflineHolds(companyId);
            offlineHolds = local.map(h => ({
                ...h,
                id: h.id, // Keep original ID
                _offline: true,
                holdName: `${h.holdName} (Offline)`
            }));
        }

        setHeldSales([...serverHolds, ...offlineHolds]);
    };

    const openShift = async () => {
        const shiftData = {
            companyId,
            openingBalance: shiftBalance || "0",
            status: "OPEN",
            openedAt: new Date().toISOString(),
            openedBy: user?.id,
            totalSales: "0",
            totalTax: "0",
            _provisional: !isOnline
        };

        try {
            if (isOnline) {
                const res = await apiFetch("/api/pos/shifts/open", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        companyId,
                        openingBalance: shiftBalance || "0"
                    })
                });
                if (res.ok) {
                    toast({ title: "Shift Opened", description: `Register opened with $${shiftBalance}` });
                    setIsShiftModalOpen(false);
                    setShiftBalance("");
                    fetchShift();
                    return;
                }
            } else {
                // Offline fallback
                await addPendingShiftAction(companyId, 'open', { openingBalance: shiftBalance || "0" });
                setCurrentShift(shiftData);
                await cacheShift(companyId, shiftData);
                toast({ title: "Shift Opened (Offline)", description: "Provisional shift started. Will sync when online." });
                setIsShiftModalOpen(false);
                setShiftBalance("");
                return;
            }
        } catch (e) {
            if (!isOnline) {
                // Secondary check for offline if network failed mid-request
                await addPendingShiftAction(companyId, 'open', { openingBalance: shiftBalance || "0" });
                setCurrentShift(shiftData);
                await cacheShift(companyId, shiftData);
                toast({ title: "Shift Opened (Offline)", description: "Connection lost. Provisional shift started." });
                setIsShiftModalOpen(false);
                setShiftBalance("");
                return;
            }
            toast({ title: "Error", description: "Failed to open shift", variant: "destructive" });
        }
    };

    const handleCloseShift = async () => {
        if (!currentShift) return;
        try {
            if (isOnline && !currentShift._provisional) {
                const res = await apiFetch(`/api/pos/shifts/${currentShift.id}/close`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ closingBalance: shiftBalance || "0" })
                });
                if (res.ok) {
                    toast({ title: "Shift Closed", description: "Z-Report generated successfully" });
                    setCurrentShift(null);
                    await cacheShift(companyId, null);
                    setIsShiftModalOpen(false);
                    setShiftBalance("");
                    fetchShift();
                    return;
                }
            } else {
                // Offline fallback or closing a provisional shift
                await addPendingShiftAction(companyId, 'close', {
                    shiftId: currentShift.id,
                    closingBalance: shiftBalance || "0"
                });
                setCurrentShift(null);
                await cacheShift(companyId, null);
                toast({ title: "Shift Closed (Offline)", description: "Closing queued. Reconciliation will sync later." });
                setIsShiftModalOpen(false);
                setShiftBalance("");
                return;
            }
        } catch (e) {
            if (!isOnline) {
                await addPendingShiftAction(companyId, 'close', {
                    shiftId: currentShift.id,
                    closingBalance: shiftBalance || "0"
                });
                setCurrentShift(null);
                await cacheShift(companyId, null);
                toast({ title: "Shift Closed (Offline)", description: "Connection lost. Closing queued." });
                setIsShiftModalOpen(false);
                setShiftBalance("");
                return;
            }
            toast({ title: "Error", description: "Failed to close shift", variant: "destructive" });
        }
    };

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast({ title: "Cart Empty", description: "Add items to cart first.", variant: "destructive" });
            return;
        }
        if (!selectedCustomerId) {
            // Find a "Cash Customer" or prompt
            const cashCustomer = resolvedCustomers?.find((c: any) => c.name.toLowerCase().includes("cash") || c.name.toLowerCase().includes("walk-in"));
            if (cashCustomer) {
                setSelectedCustomerId(cashCustomer.id.toString());
            } else {
                toast({ title: "Customer Required", description: "Please select or create a customer.", variant: "destructive" });
                return;
            }
        }
        setIsCheckoutOpen(true);
    };

    const processOrder = async () => {
        let finalCustomerId = selectedCustomerId;
        const settings = company?.posSettings as any;
        if (!finalCustomerId && settings?.defaultCustomerId) {
            finalCustomerId = settings.defaultCustomerId;
        }

        if (!finalCustomerId) return;
        setIsProcessing(true);
        if (parseFloat(paidAmount || "0") < total) {
            toast({
                title: "Insufficient Payment",
                description: `Received amount (${currencyInfo.symbol}${paidAmount}) is less than total payable (${fmt(total)})`,
                variant: "destructive"
            });
            setIsProcessing(false);
            return;
        }

        try {
            const currency = resolvedCurrencies?.find((c: any) => c.code === selectedCurrencyCode) || { code: "USD", exchangeRate: "1" };
            const invoiceData = {
                companyId,
                customerId: parseInt(finalCustomerId),
                issueDate: new Date(),
                dueDate: new Date(),
                notes: "POS Transaction",
                currency: currency.code,
                exchangeRate: currency.exchangeRate,
                paymentMethod,
                status: "issued",
                isPos: true,
                createdBy: user?.id,
                discountAmount: orderDiscount.toString(),
                transactionType: "FiscalInvoice",
                subtotal: subtotal.toString(),
                taxAmount: taxAmount.toString(),
                total: total.toString(),
                taxInclusive: taxInclusive,
                items: cart.map(item => ({
                    productId: item.productId,
                    description: item.name,
                    quantity: item.quantity.toString(),
                    unitPrice: item.price.toString(),
                    discountAmount: item.discountAmount.toString(),
                    taxRate: item.taxRate.toString(),
                    lineTotal: ((item.price * item.quantity) - item.discountAmount).toString(),
                    taxTypeId: item.taxTypeId
                }))
            };

            // ─── Offline fallback: queue sale locally ────────────────────
            if (!isOnline) {
                const offlineId = await addPendingSale(companyId, invoiceData);
                const offInvoice = {
                    id: offlineId,
                    ...invoiceData,
                    _offline: true,
                    invoiceNumber: `OFFLINE-${Date.now().toString().slice(-6)}`,
                };
                if (posSettings.printingEnabled) {
                    setLastSuccessfulInvoice(offInvoice);
                } else {
                    toast({ title: "📴 Saved Offline", description: "Sale queued — will sync when reconnected" });
                    setActiveView("products");
                }
                setCart([]);
                setOrderDiscount(0);
                resetToDefaultCustomer();
                setPaidAmount("");
                setIsCheckoutOpen(false);
                clearPersistedSession();

                // Register Background Sync
                if ('serviceWorker' in navigator && 'SyncManager' in window) {
                    navigator.serviceWorker.ready.then(reg => {
                        return (reg as any).sync.register('sync-sales');
                    }).catch(err => console.error("[Sync] Registration failed:", err));
                }

                await refreshPendingCount();
                return;
            }

            const result = await createInvoice.mutateAsync(invoiceData as any);
            // Cash drawer: open after successful sale when running in Electron and enabled
            if (window.electronAPI && posSettings.cashDrawerEnabled) {
                const printerName = localStorage.getItem('pos_printer_name') || undefined;
                window.electronAPI.openCashDrawer(printerName).catch(console.error);
            }
            if (posSettings.printingEnabled) {
                setLastSuccessfulInvoice(result);
            } else {
                toast({ title: "Success", description: "Order processed successfully" });
                setActiveView("products");
            }
            setCart([]);
            setOrderDiscount(0);
            resetToDefaultCustomer();
            setPaidAmount("");
            setIsCheckoutOpen(false);
            clearPersistedSession();
        } catch (error: any) {
            // If the error looks like a network failure, queue offline
            if (!navigator.onLine || error.message === 'Failed to fetch') {
                try {
                    const currency = resolvedCurrencies?.find((c: any) => c.code === selectedCurrencyCode) || { code: "USD", exchangeRate: "1" };
                    const invoiceData = {
                        companyId,
                        customerId: parseInt(finalCustomerId),
                        issueDate: new Date(),
                        dueDate: new Date(),
                        notes: "POS Transaction",
                        currency: currency.code,
                        exchangeRate: currency.exchangeRate,
                        paymentMethod,
                        status: "issued",
                        isPos: true,
                        createdBy: user?.id,
                        discountAmount: orderDiscount.toString(),
                        transactionType: "FiscalInvoice",
                        subtotal: subtotal.toString(),
                        taxAmount: taxAmount.toString(),
                        total: total.toString(),
                        taxInclusive: taxInclusive,
                        items: cart.map(item => ({
                            productId: item.productId,
                            description: item.name,
                            quantity: item.quantity.toString(),
                            unitPrice: item.price.toString(),
                            discountAmount: item.discountAmount.toString(),
                            taxRate: item.taxRate.toString(),
                            lineTotal: ((item.price * item.quantity) - item.discountAmount).toString(),
                            taxTypeId: item.taxTypeId
                        }))
                    };
                    const offlineId = await addPendingSale(companyId, invoiceData);
                    const offInvoice = {
                        id: offlineId,
                        ...invoiceData,
                        _offline: true,
                        invoiceNumber: `OFFLINE-${Date.now().toString().slice(-6)}`,
                    };
                    if (posSettings.printingEnabled) {
                        setLastSuccessfulInvoice(offInvoice);
                    } else {
                        toast({ title: "📴 Saved Offline", description: "Connection lost — sale queued for sync" });
                        setActiveView("products");
                    }
                    setCart([]);
                    setOrderDiscount(0);
                    resetToDefaultCustomer();
                    setPaidAmount("");
                    setIsCheckoutOpen(false);
                    clearPersistedSession();

                    // Register Background Sync
                    if ('serviceWorker' in navigator && 'SyncManager' in window) {
                        navigator.serviceWorker.ready.then(reg => {
                            return (reg as any).sync.register('sync-sales');
                        }).catch(err => console.error("[Sync] Registration failed:", err));
                    }

                    await refreshPendingCount();
                    return;
                } catch (offlineError) {
                    toast({ title: "Error", description: "Failed to save sale offline", variant: "destructive" });
                }
            }
            // Handle NO_ACTIVE_SHIFT error specifically
            if (error.message?.includes("No active shift") || error.code === "NO_ACTIVE_SHIFT") {
                setIsCheckoutOpen(false);
                toast({
                    title: "Shift Required",
                    description: "Please open a shift before processing sales",
                    variant: "destructive"
                });
                // Prompt user to open shift
                setShiftModalType("OPEN");
                setIsShiftModalOpen(true);
            } else {
                toast({ title: "Error", description: error.message || "Could not process transaction", variant: "destructive" });
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const holdOrder = async () => {
        if (cart.length === 0) return;
        try {
            if (isOnline) {
                const res = await apiFetch("/api/pos/holds", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        companyId,
                        cartData: cart,
                        holdName: `Hold ${new Date().toLocaleTimeString()}`
                    })
                });
                if (!res.ok) throw new Error("Failed to hold sale");
            } else {
                // Offline hold
                await addOfflineHold(companyId, cart, selectedCustomerId, `Hold ${new Date().toLocaleTimeString()}`);
            }

            setCart([]);
            setSelectedCustomerId("");
            toast({ title: isOnline ? "Held" : "Held (Offline)", description: "Sale parked successfully" });
            fetchHeldSales();
        } catch (e: any) {
            // Fallback to offline if API fails
            try {
                await addOfflineHold(companyId, cart, selectedCustomerId, `Hold ${new Date().toLocaleTimeString()}`);
                setCart([]);
                setSelectedCustomerId("");
                toast({ title: "Held (Offline)", description: "Connection lost. Sale parked locally." });
                fetchHeldSales();
            } catch (offlineErr) {
                toast({ title: "Error", description: "Failed to hold sale", variant: "destructive" });
            }
        }
    };

    const resumeHold = async (hold: any) => {
        try {
            if (hold._offline) {
                await removeOfflineHold(hold.id);
            } else if (isOnline) {
                const res = await apiFetch(`/api/pos/holds/${hold.id}`, { method: "DELETE" });
                if (!res.ok) throw new Error("Failed to remove hold");
            } else {
                toast({ title: "Online Hold", description: "Must be online to resume cloud holds", variant: "destructive" });
                return;
            }

            setCart(hold.cartData);
            setSelectedCustomerId(hold.customerId?.toString() || "");
            setIsHoldsModalOpen(false);
            fetchHeldSales();
        } catch (e) {
            toast({ title: "Error", description: "Failed to resume sale", variant: "destructive" });
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {
                toast({ title: "Fullscreen Error", description: "Your browser blocked fullscreen mode.", variant: "destructive" });
            });
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreen(false);
            }
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);


    // Sync Settings from Company
    useEffect(() => {
        const src = company;
        if (src?.posSettings) {
            const settings = src.posSettings as any;
            setPosSettings(prev => ({
                ...prev,
                printingEnabled: settings.printingEnabled ?? true,
                autoPrint: settings.autoPrint ?? true,
                silentPrinting: settings.silentPrinting ?? false,
                printServerUrl: settings.printServerUrl || "http://localhost:12312",
                printerName: prev.printerName || settings.printerName || "",
                cashDrawerEnabled: settings.cashDrawerEnabled ?? false
            }));
        }
    }, [company]);

    // Auto-Print Effect
    useEffect(() => {
        if (lastSuccessfulInvoice && posSettings.printingEnabled && posSettings.autoPrint) {
            if (posSettings.silentPrinting) {
                handleSilentPrint().then(() => {
                    // Auto-advance after silent print completes
                    setTimeout(() => {
                        setLastSuccessfulInvoice(null);
                        setActiveView("products");
                    }, 1500);
                });
            } else {
                // Small delay to ensure Dialog content is rendered in the Portal
                const timer = setTimeout(() => {
                    window.print();
                    // Auto-advance after print dialog shows
                    setLastSuccessfulInvoice(null);
                    setActiveView("products");
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [lastSuccessfulInvoice, posSettings.printingEnabled, posSettings.autoPrint, posSettings.silentPrinting]);

    // Fetch available printers when settings dialog opens
    useEffect(() => {
        const fetchPrinters = async () => {
            if (!isSettingsOpen) return;
            try {
                const response = await fetch(`${posSettings.printServerUrl}/printers`);
                if (response.ok) {
                    const data = await response.json();
                    setAvailablePrinters(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Failed to fetch printers:", error);
            }
        };
        fetchPrinters();
    }, [isSettingsOpen, posSettings.printServerUrl]);

    // Persist local printer selection
    useEffect(() => {
        if (posSettings.printerName) {
            localStorage.setItem("pos_printer_name", posSettings.printerName);
        } else {
            localStorage.removeItem("pos_printer_name");
        }
    }, [posSettings.printerName]);

    const handleSilentPrint = async () => {
        let receiptElement = document.getElementById('silent-receipt-48');

        // Retry logic if element is not yet in DOM
        if (!receiptElement) {
            console.log("Silent receipt element not found, retrying...");
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 200));
                receiptElement = document.getElementById('silent-receipt-48');
                if (receiptElement) break;
            }
        }

        if (!receiptElement) {
            toast({
                title: "Print Error",
                description: "Receipt element not found. Please try again.",
                variant: "destructive"
            });
            return;
        }

        try {
            const html = receiptElement.outerHTML;
            
            if (window.electronAPI) {
                await window.electronAPI.printReceipt(html, posSettings.printerName || undefined);
            } else {
                // Wrap in a basic document with styling if needed, but receipt-48 already has <style>
                const response = await fetch(`${posSettings.printServerUrl}/print`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        html,
                        printerName: posSettings.printerName || undefined
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || "Failed to send print job");
                }
            }

            toast({ title: "Sent to Printer", description: "Silent print job sent successfully." });
        } catch (error: any) {
            console.error("Silent Print Error:", error);
            toast({
                title: "Print Failed",
                description: "Print server not reachable or error occurred. Is the middleware running?",
                variant: "destructive"
            });
            // Fallback to manual print if it fails? 
            // window.print();
        }
    };

    // Set Default Customer
    useEffect(() => {
        const settings = company?.posSettings as any;
        if (settings?.defaultCustomerId && !selectedCustomerId && customers) {
            // Only set if exists in customers list
            const exists = resolvedCustomers.find((c: any) => c.id.toString() === settings.defaultCustomerId);
            if (exists) {
                setSelectedCustomerId(settings.defaultCustomerId);
            }
        }
    }, [company, customers, selectedCustomerId]);

    // Auto-select valid payment method
    useEffect(() => {
        const settings = company?.posSettings as any;
        const allowed = settings?.allowedPaymentMethods;

        if (allowed && allowed.length > 0) {
            if (!allowed.includes(paymentMethod)) {
                setPaymentMethod(allowed[0]);
            }
        }
    }, [company, paymentMethod]);

    useEffect(() => {
        fetchHeldSales();
        fetchShift();
    }, [companyId]);

    const handleOrderDiscountChange = (val: string) => {
        const amount = parseFloat(val) || 0;
        const settings = company?.posSettings as any;

        // Logic: Require override if enabled in settings OR if discount is high
        if (settings?.requireOverrideForDiscount || (amount > 0 && subtotal > 0 && amount > (subtotal * 0.1))) {
            setPendingOverride({ type: "DISCOUNT", data: amount });
        } else {
            setOrderDiscount(amount);
        }
    };

    const handleClearCart = () => {
        if (cart.length === 0) return;
        const settings = company?.posSettings as any;
        
        if (settings?.requireOverrideForDelete) {
            setPendingOverride({ type: "VOID_CART", data: null });
        } else {
            setCart([]);
            setOrderDiscount(0);
            resetToDefaultCustomer();
        }
    };

    // ── Reprint receipts ─────────────────────────────────────────────────────
    const handleReprintLast = async () => {
        setIsReprintOpen(true);
        setReprintListLoading(true);
        setReprintList([]);
        try {
            const res = await apiFetch(`/api/pos/last-receipt?companyId=${companyId}`);
            if (res.ok) setReprintList(await res.json());
            else toast({ title: "No receipts found for today", variant: "destructive" });
        } catch {
            toast({ title: "Failed to load receipts", variant: "destructive" });
        }
        setReprintListLoading(false);
    };

    // ── Credit / Debit Note search ────────────────────────────────────────────
    const handleCnSearch = async () => {
        if (!cnSearchQuery.trim()) return;
        setCnSearching(true);
        try {
            const res = await apiFetch(`/api/pos/invoice-search?companyId=${companyId}&q=${encodeURIComponent(cnSearchQuery)}`);
            if (res.ok) setCnSearchResults(await res.json());
        } catch { /* ignore */ }
        setCnSearching(false);
    };

    const handleIssueCreditDebitNote = async (originalInvoice: any) => {
        setCnProcessing(true);
        try {
            const endpoint = cnType === "credit"
                ? `/api/invoices/${originalInvoice.id}/credit-note`
                : `/api/invoices/${originalInvoice.id}/debit-note`;
            const res = await apiFetch(endpoint, { method: "POST" });
            if (!res.ok) {
                const err = await res.json();
                toast({ title: "Failed", description: err.message, variant: "destructive" });
                return;
            }
            const note = await res.json();
            toast({ title: cnType === "credit" ? "Credit Note Created" : "Debit Note Created", description: `${note.invoiceNumber} — issued successfully` });
            setIsCreditNoteOpen(false);
            setCnSearchQuery("");
            setCnSearchResults([]);
            // Show receipt for the note
            setReprintInvoice({ ...note, originalInvoice });
        } catch {
            toast({ title: "Error", description: "Could not create note", variant: "destructive" });
        }
        setCnProcessing(false);
    };

    // ── X / Z Report ─────────────────────────────────────────────────────────
    const handleLoadReport = async (type: "x" | "z") => {
        setReportType(type);
        setReportLoading(true);
        setReportData(null);
        setIsReportOpen(true);
        try {
            const endpoint = type === "x"
                ? `/api/companies/${companyId}/zimra/day/x-report`
                : `/api/companies/${companyId}/zimra/day/z-report`;
            const res = await apiFetch(endpoint);
            if (!res.ok) {
                const err = await res.json();
                setReportData({ error: err.message });
            } else {
                setReportData(await res.json());
            }
        } catch (e: any) {
            setReportData({ error: e.message });
        }
        setReportLoading(false);
    };
    // ─────────────────────────────────────────────────────────────────────────

    const handleOverrideSuccess = (manager: any) => {
        if (!pendingOverride) return;

        if (pendingOverride.type === "DISCOUNT") {
            setOrderDiscount(pendingOverride.data);
            toast({ title: "Discount Authorized", description: `Approved by ${manager.name}` });
        } else if (pendingOverride.type === "VOID_CART") {
            setCart([]);
            setOrderDiscount(0);
            resetToDefaultCustomer();
            toast({ title: "Cart Cleared", description: `Void approved by ${manager.name}` });
        } else if (pendingOverride.type === "REMOVE_ITEM") {
            const productId = pendingOverride.data;
            setCart(prev => prev.filter(item => item.productId !== productId));
            toast({ title: "Item Removed", description: `Approved by ${manager.name}` });
        } else if (pendingOverride.type === "PRICE_CHANGE") {
            const { productId, price } = pendingOverride.data;
            setCart(prev => prev.map(item =>
                item.productId === productId ? { ...item, price } : item
            ));
            toast({ title: "Price Updated", description: `Approved by ${manager.name}` });
        } else if (pendingOverride.type === "OPEN_DRAWER") {
            toast({ title: "Drawer Opened", description: `Approved by ${manager.name}` });
            // triggerOpenDrawer();
        }
        setPendingOverride(null);
    };


    // Tactile Numpad Component
    function Numpad({ value, onChange, onEnter }: { value: string, onChange: (val: string) => void, onEnter?: () => void }) {
        const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ".", "DEL"];
        return (
            <div className="grid grid-cols-3 gap-1 p-1 md:p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                {buttons.map(btn => (
                    <Button
                        key={btn}
                        variant="ghost"
                        className={cn(
                            "h-7 md:h-10 font-black text-[10px] md:text-sm rounded-lg transition-all active:scale-95",
                            btn === "DEL" ? "text-red-500 hover:bg-red-50" : "bg-white shadow-sm border border-slate-200/50 text-slate-700 hover:bg-slate-50"
                        )}
                        onClick={() => {
                            if (btn === "DEL") onChange(value.slice(0, -1));
                            else if (btn === "." && value.includes(".")) return;
                            else onChange(value + btn);
                        }}
                    >
                        {btn}
                    </Button>
                ))}
            </div>
        );
    }

    // Sub-component defined inside to have access to POSPage state
    function CartSection() {
        return (
            <div className="flex flex-col h-full bg-white relative overflow-hidden">
                {/* Premium Cart Header */}
                <div className="pt-6 pb-3 px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10 sticky top-0">
                    <div className="flex flex-col">
                        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                            Current Order
                        </h3>
                        <p className="text-[11px] uppercase tracking-widest text-slate-400 font-black">ID: #POS-{new Date().getTime().toString().slice(-6)}</p>
                    </div>
                    <Badge variant="secondary" className="bg-primary/5 text-primary font-black border-none px-3 py-1 text-xs rounded-lg">
                        {cart.reduce((a, b) => a + b.quantity, 0)} Items
                    </Badge>
                </div>

                <ScrollArea className="flex-1 px-3 py-3 overflow-y-auto">
                    {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-slate-300">
                            <ShoppingCart className="h-8 w-8 opacity-20 mb-3" />
                            <p className="text-xs font-black text-slate-400">Cart is Empty</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {cart.map(item => (
                                <div key={item.productId} className="group relative bg-white hover:bg-slate-50 p-2 rounded-xl border border-slate-100/50 transition-all duration-200 shadow-sm flex items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="text-[11px] font-black text-slate-800 truncate leading-none">{item.name}</h4>
                                            <p className="text-[11px] font-black text-slate-900 shrink-0">
                                                ${((item.price * item.quantity) - item.discountAmount).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <button 
                                                className="text-[11px] font-bold text-slate-400 hover:text-primary transition-colors hover:underline"
                                                onClick={() => {
                                                    const newPriceStr = prompt("Enter new price:", item.price.toString());
                                                    if (newPriceStr) {
                                                        const p = parseFloat(newPriceStr);
                                                        if (!isNaN(p)) updatePrice(item.productId, p);
                                                    }
                                                }}
                                            >
                                                ${item.price.toFixed(2)}
                                            </button>
                                            {item.discountAmount > 0 && (
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1 rounded">-{item.discountAmount.toFixed(2)}</span>
                                            )}
                                            {resolvedProducts?.find((p: any) => p.id === item.productId)?.isTracked && (
                                                <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-1 rounded uppercase tracking-tighter">
                                                    Stock: {(resolvedProducts?.find((p: any) => p.id === item.productId)?.stockLevel || 0) - (cart.find(c => c.productId === item.productId)?.quantity || 0)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 hover:bg-white rounded-md p-0"
                                                onClick={() => updateQuantity(item.productId, -1)}
                                            >
                                                <Minus className="h-3.5 w-3.5 text-slate-600" />
                                            </Button>
                                            <span className="text-xs font-black w-5 text-center text-slate-700">{item.quantity}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 hover:bg-white rounded-md p-0"
                                                onClick={() => updateQuantity(item.productId, 1)}
                                            >
                                                <Plus className="h-3.5 w-3.5 text-slate-600" />
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                            onClick={() => removeFromCart(item.productId)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                {/* Tactical Footer - Ultra Compact Fixed/Afloat */}
                <div className="mt-auto p-3 bg-white/95 backdrop-blur-md border-t border-slate-100 space-y-2 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] z-20 sticky bottom-0">
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span className="text-slate-600">{fmt(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Tax (VAT)</span>
                            <span className="text-slate-600">{fmt(taxAmount)}</span>
                        </div>

                        {orderDiscount > 0 && (
                            <div className="flex justify-between text-[10px] font-black text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100 items-center">
                                <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Discount</span>
                                <span>-{fmt(orderDiscount)}</span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 pt-1 group">
                            <div className="relative flex-1">
                                <Tag className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-primary transition-colors" />
                                <Input
                                    type="number"
                                    placeholder="Order Discount..."
                                    className="h-9 pl-9 bg-slate-50/50 border-none rounded-lg focus:ring-4 focus:ring-primary/10 transition-all text-xs font-bold group-hover:bg-slate-100"
                                    value={orderDiscount || ""}
                                    onChange={(e) => handleOrderDiscountChange(e.target.value)}
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                onClick={handleClearCart}
                                disabled={cart.length === 0}
                                title="Clear Cart"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex justify-between items-center py-1.5 border-t border-slate-100 border-dashed mt-1.5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total</span>
                            <div className="text-right">
                                <p className="text-xl font-black text-slate-900 tracking-tight leading-none">{fmt(total)}</p>
                                <p className="text-[9px] font-bold text-emerald-600 mt-0.5 uppercase tracking-widest">{currencyInfo.symbol} {selectedCurrencyCode}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            className="h-12 gap-2 font-black uppercase tracking-widest text-[10px] border-slate-200 hover:bg-slate-50 transition-all rounded-xl shadow-sm active:scale-95 group"
                            disabled={cart.length === 0}
                            onClick={holdOrder}
                        >
                            <Pause className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                            Hold
                        </Button>
                        <Button
                            className="h-12 gap-2 font-black uppercase tracking-widest text-[10px] bg-primary hover:bg-primary/90 text-white transition-all rounded-xl shadow-lg shadow-primary/20 active:scale-95 group"
                            disabled={cart.length === 0}
                            onClick={handleCheckout}
                        >
                            <ShoppingCart className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            Checkout
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <PosLayout>
            <div className="flex flex-col h-screen overflow-hidden bg-slate-50/50 print:hidden">
                {/* Manager Override Dialog */}
                <ManagerOverride
                    isOpen={!!pendingOverride}
                    onClose={() => setPendingOverride(null)}
                    onAuthorized={handleOverrideSuccess}
                    title={
                        pendingOverride?.type === "DISCOUNT" ? "Authorize Discount" : 
                        pendingOverride?.type === "VOID_CART" ? "Authorize Void" :
                        pendingOverride?.type === "REMOVE_ITEM" ? "Authorize Delete" :
                        pendingOverride?.type === "PRICE_CHANGE" ? "Authorize Price Change" :
                        "Manager Authorization"
                    }
                    description={
                        pendingOverride?.type === "DISCOUNT" ? "Manager PIN required for discount" : 
                        pendingOverride?.type === "VOID_CART" ? "Manager PIN required to void cart" :
                        pendingOverride?.type === "REMOVE_ITEM" ? "Manager PIN required to remove item" :
                        pendingOverride?.type === "PRICE_CHANGE" ? "Manager PIN required to change price" :
                        "Manager PIN required to proceed"
                    }
                />


                {/* ─── Stale Data Warning ─── */}
                {lastCacheTime && (Date.now() - lastCacheTime > 24 * 60 * 60 * 1000) && (
                    <div className="px-3 md:px-6 py-2 pt-10 md:pt-2 bg-red-600 text-white shrink-0 z-40 print:hidden flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-tighter animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        Warning: Offline data is over 24h old. Refresh required for accurate pricing/stock.
                        <Button
                            variant="link"
                            className="h-auto p-0 text-white underline text-[10px] font-black"
                            onClick={() => window.location.reload()}
                        >
                            Refresh Now
                        </Button>
                    </div>
                )}

                {/* ─── Offline / Sync Status Banner ─── */}
                {(!isOnline || pendingSalesCount > 0 || syncStatus === 'syncing') && (
                    <div className={cn(
                        "px-3 md:px-6 py-2 pt-10 md:pt-2 shrink-0 z-40 print:hidden transition-colors animate-in slide-in-from-top-2 duration-300",
                        !isOnline
                            ? "bg-amber-500 text-white"
                            : syncStatus === 'syncing'
                                ? "bg-blue-500 text-white"
                                : "bg-emerald-500 text-white"
                    )}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                {!isOnline ? (
                                    <><WifiOff className="h-4 w-4" /> Offline Mode — Sales will be queued</>
                                ) : syncStatus === 'syncing' ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Syncing {syncProgress.synced}/{syncProgress.total}...</>
                                ) : (
                                    <><CloudUpload className="h-4 w-4" /> {pendingSalesCount} Pending Sale{pendingSalesCount !== 1 ? 's' : ''}</>
                                )}
                            </div>
                            {isOnline && pendingSalesCount > 0 && syncStatus !== 'syncing' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-3 text-[10px] font-black text-white hover:bg-white/20 rounded-lg"
                                    onClick={() => triggerSync()}
                                >
                                    <RefreshCw className="h-3 w-3 mr-1" /> Sync Now
                                </Button>
                            )}
                        </div>
                        {/* Sync Progress Bar */}
                        {syncStatus === 'syncing' && syncProgress.total > 0 && (
                            <div className="w-full bg-white/20 rounded-full h-1.5 mt-2 overflow-hidden">
                                <div
                                    className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${(syncProgress.synced / syncProgress.total) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* High-End Command Center Header */}
                <div className="bg-white border-b border-slate-200/60 px-3 md:px-6 py-4 md:py-4 pt-10 md:pt-4 shrink-0 backdrop-blur-md sticky top-0 z-30 shadow-sm">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-6 items-stretch md:items-center">
                        <div className="flex gap-2 items-center">
                            {/* Brand & Context - Hyper Compact on Mobile */}
                            <div className="flex items-center justify-between md:justify-start gap-2 md:gap-4 shrink-0 flex-1 md:flex-none">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-900 rounded-xl md:rounded-xl flex items-center justify-center shadow-lg shrink-0">
                                        <Package className="h-4 w-4 md:h-5 md:w-5 text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <h1 className="text-xs md:text-sm font-black text-slate-900 leading-none truncate max-w-[80px] md:max-w-[120px] lg:max-w-[160px]">{resolvedCompany?.name || "Premium POS"}</h1>
                                        <div className="flex items-center gap-1.5 mt-0.5 md:mt-1">
                                            <p className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-primary font-black hidden md:block">Elite Terminal</p>
                                            <div className={cn(
                                                "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider",
                                                isOnline
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-amber-100 text-amber-700"
                                            )}>
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                                                )} />
                                                {isOnline ? <><Wifi className="h-2.5 w-2.5" /> Online</> : <><WifiOff className="h-2.5 w-2.5" /> Offline</>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mobile Customer Selector (Compact) */}
                                <div className="md:hidden">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-xs font-bold text-slate-700 bg-slate-100/50 hover:bg-slate-100 rounded-lg border border-slate-200/50">
                                                <User className="h-3 w-3 text-slate-500" />
                                                <span className="truncate max-w-[60px]">
                                                    {resolvedCustomers?.find((c: any) => c.id.toString() === selectedCustomerId)?.name.split(' ')[0] || "Guest"}
                                                </span>
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="w-[90%] rounded-2xl">
                                            <DialogHeader>
                                                <DialogTitle>Select Customer</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start gap-2 h-12"
                                                    onClick={() => {
                                                        const walkIn = resolvedCustomers?.find((c: any) => c.name.toLowerCase().includes("walk-in") || c.name.toLowerCase().includes("cash"));
                                                        if (walkIn) setSelectedCustomerId(walkIn.id.toString());
                                                    }}
                                                >
                                                    <UserPlus className="h-4 w-4" />
                                                    <span>Select Walk-in / Cash</span>
                                                </Button>
                                                <div className="space-y-2">
                                                    <Label>Search Customer</Label>
                                                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                                        <SelectTrigger className="h-12">
                                                            <SelectValue placeholder="Select Customer" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {resolvedCustomers?.map((c: any) => (
                                                                <SelectItem key={c.id} value={c.id.toString()}>
                                                                    {c.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                {/* Mobile Total Indicator */}
                                {activeView === "products" && (
                                    <div className="md:hidden flex items-center gap-2 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shrink-0">
                                        <span className="text-[10px] font-black text-emerald-700">{fmt(total)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Open Drawer Button (Visible next to logo) */}
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 md:h-10 px-2 md:px-4 rounded-lg md:rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 transition-all font-bold text-[10px] md:text-xs gap-1.5"
                                onClick={handleOpenDrawer}
                            >
                                <Banknote className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                <span className="hidden md:inline">Open Drawer</span>
                            </Button>
                            {/* Mobile Holds Button (Visible next to logo) */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="md:hidden h-8 w-8 p-0 rounded-lg border-slate-200 shrink-0 relative"
                                onClick={() => setIsHoldsModalOpen(true)}
                            >
                                <History className="h-4 w-4 text-slate-500" />
                                {heldSales.length > 0 && (
                                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary rounded-full ring-2 ring-white" />
                                )}
                            </Button>
                            {/* Mobile Menu Trigger (New Location) */}
                            <div className="md:hidden flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center text-white cursor-pointer hover:bg-slate-800 transition-all shadow-lg group relative">
                                            <SettingsIcon className="h-4 w-4 opacity-70 group-hover:rotate-90 transition-transform" />
                                            {/* Shift Status Indicator Dot */}
                                            <div className={cn("absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white", currentShift ? "bg-emerald-500" : "bg-red-500")} />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-2xl border-slate-100">
                                        <DropdownMenuLabel className="flex flex-col gap-1 p-3">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Terminal Info</span>
                                            <span className="text-sm font-black text-slate-900">{company?.name || "Premium POS"}</span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400">ID: {companyId}</span>
                                                <Badge variant={currentShift ? "default" : "destructive"} className="h-4 text-[9px] px-1">
                                                    {currentShift ? "SHIFT OPEN" : "SHIFT CLOSED"}
                                                </Badge>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-slate-50" />

                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer" onClick={() => setIsHoldsModalOpen(true)}>
                                            <History className="h-4 w-4 mr-3 text-slate-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">Held Sales {heldSales.length > 0 && `(${heldSales.length})`}</span>
                                                <span className="text-[10px] text-slate-400">Recall parked transactions</span>
                                            </div>
                                        </DropdownMenuItem>

                                        <MySalesModal
                                            companyId={companyId}
                                            company={company}
                                            posSettings={posSettings}
                                            user={user}
                                            trigger={
                                                <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer" onSelect={(e) => e.preventDefault()}>
                                                    <Receipt className="h-4 w-4 mr-3 text-slate-500" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">My Sales</span>
                                                        <span className="text-[10px] text-slate-400">View & Reprint Receipts</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            }
                                        />

                                        {currentShift ? (
                                            <DropdownMenuItem className="p-3 rounded-xl focus:bg-red-50 cursor-pointer text-red-600" onClick={() => { setShiftModalType("CLOSE"); setShiftBalance(""); setIsShiftModalOpen(true); }}>
                                                <XCircle className="h-4 w-4 mr-3" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">End Shift</span>
                                                    <span className="text-[10px] opacity-70">Close register & Z-Report</span>
                                                </div>
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem className="p-3 rounded-xl focus:bg-emerald-50 cursor-pointer text-emerald-600" onClick={() => { setShiftModalType("OPEN"); setShiftBalance(""); setIsShiftModalOpen(true); }}>
                                                <Play className="h-4 w-4 mr-3" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">Open Shift</span>
                                                    <span className="text-[10px] opacity-70">Start new service period</span>
                                                </div>
                                            </DropdownMenuItem>
                                        )}

                                        <DropdownMenuSeparator className="bg-slate-50" />
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-blue-50 cursor-pointer" onClick={handleReprintLast}>
                                            <Printer className="h-4 w-4 mr-3 text-blue-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">Reprint Last Receipt</span>
                                                <span className="text-[10px] text-slate-400">Reprint most recent sale</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-amber-50 cursor-pointer" onClick={() => { setCnType("credit"); setIsCreditNoteOpen(true); }}>
                                            <FileText className="h-4 w-4 mr-3 text-amber-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">Credit / Debit Note</span>
                                                <span className="text-[10px] text-slate-400">Issue return or adjustment</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-purple-50 cursor-pointer" onClick={() => handleLoadReport("x")}>
                                            <LayoutGrid className="h-4 w-4 mr-3 text-purple-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">X-Report</span>
                                                <span className="text-[10px] text-slate-400">Current day summary</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-slate-50" />
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer text-slate-400" onClick={() => setIsSettingsOpen(true)}>
                                            <SettingsIcon className="h-4 w-4 mr-3" />
                                            <span className="text-sm font-bold">Device Settings</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-red-50 cursor-pointer text-red-600" onClick={logout}>
                                            <LogOut className="h-4 w-4 mr-3" />
                                            <span className="text-sm font-bold">Sign Out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Elite Search Bar - Full width on mobile */}
                        <div className="relative flex-1 group flex items-center gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="h-4 w-4 md:h-5 md:w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                </div>
                                <Input
                                    autoFocus
                                    ref={searchInputRef}
                                    placeholder="Search products... (F1)"
                                    className="pl-10 md:pl-12 h-10 md:h-14 w-full bg-slate-50 border-none rounded-xl md:rounded-2xl text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Global Currency Switcher */}
                            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                {['USD', 'ZWG'].map(cc => (
                                    <button
                                        key={cc}
                                        onClick={() => setSelectedCurrencyCode(cc)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[10px] font-black transition-all",
                                            selectedCurrencyCode === cc 
                                                ? "bg-white text-primary shadow-sm" 
                                                : "text-slate-400 hover:text-slate-600"
                                        )}
                                    >
                                        {cc}
                                    </button>
                                ))}
                            </div>

                            {/* Mobile Category Filter Trigger */}
                            <div className="md:hidden">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-200 bg-white shadow-sm">
                                            <Filter className={cn("h-4 w-4", selectedCategory !== "All Products" ? "text-primary" : "text-slate-500")} />
                                            {selectedCategory !== "All Products" && (
                                                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary rounded-full ring-2 ring-white" />
                                            )}
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="bottom" className="h-[80vh] rounded-t-[2rem] p-0 flex flex-col">
                                        <div className="p-6 pb-2 border-b border-slate-100">
                                            <SheetHeader className="text-left">
                                                <SheetTitle className="text-lg font-black text-slate-900">Filter Categories</SheetTitle>
                                            </SheetHeader>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-6">
                                            <div className="grid grid-cols-2 gap-3">
                                                {categories.map(cat => (
                                                    <Button
                                                        key={cat}
                                                        variant={selectedCategory === cat ? "default" : "outline"}
                                                        onClick={() => setSelectedCategory(cat)}
                                                        className={cn(
                                                            "h-auto py-4 flex flex-col gap-2 items-center justify-center rounded-2xl border transition-all",
                                                            selectedCategory === cat
                                                                ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary"
                                                                : "bg-white text-slate-500 border-slate-100 hover:border-primary/20 hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <Tag className={cn("h-6 w-6", selectedCategory === cat ? "text-white" : "text-slate-300")} />
                                                        <span className="font-bold text-xs text-center">{cat}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="p-6 border-t border-slate-100 bg-slate-50">
                                            <SheetClose asChild>
                                                <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs">
                                                    Apply Filter
                                                </Button>
                                            </SheetClose>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </div>

                        {/* Integrated Controls & Profile - Compacted to prevent scrolling */}
                        <div className="hidden md:flex items-center gap-1 lg:gap-2 pb-1 md:pb-0 shrink-0">
                            {/* Customer Selector - Premium */}
                            <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg border border-slate-200/50 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 rounded-md bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-primary hover:bg-white p-0"
                                    onClick={() => {
                                        const walkIn = resolvedCustomers?.find((c: any) => c.name.toLowerCase().includes("walk-in") || c.name.toLowerCase().includes("cash"));
                                        if (walkIn) setSelectedCustomerId(walkIn.id.toString());
                                        else toast({ title: "No Walk-in Customer", description: "Create 'Walk-in' first." });
                                    }}
                                >
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger className="w-24 lg:w-32 h-8 border-none bg-transparent hover:bg-slate-200/30 transition-all font-bold text-slate-700 px-2">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                            <SelectValue placeholder="Customer" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
                                        {resolvedCustomers?.map((c: any) => (
                                            <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-primary/5 rounded-lg py-2.5">
                                                <div className="font-bold text-slate-700">{c.name}</div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="h-6 w-px bg-slate-200 mx-0.5 hidden lg:block" />

                            {/* Quick Action Pills - Compact */}
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    className="h-9 px-2 lg:px-3 gap-1.5 border-slate-200 rounded-lg hover:bg-slate-50 transition-all font-bold group"
                                    onClick={() => setIsHoldsModalOpen(true)}
                                >
                                    <div className="relative">
                                        <History className="h-4 w-4 text-slate-500 group-hover:rotate-[-45deg] transition-transform" />
                                        {heldSales.length > 0 && (
                                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary rounded-full ring-2 ring-white" />
                                        )}
                                    </div>
                                    <span className="text-slate-600 hidden lg:inline">Holds</span>
                                    <Badge variant="secondary" className="lg:ml-1 h-4 bg-slate-100 text-slate-500 border-none px-1 font-black text-[9px]">
                                        {heldSales.length}
                                    </Badge>
                                </Button>

                                <div className={cn(
                                    "flex items-center gap-1.5 px-2 h-9 rounded-lg border text-[10px] lg:text-xs font-black shrink-0 shadow-sm",
                                    currentShift ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
                                )}>
                                    <div className="relative">
                                        <div className={cn("w-3 h-3 rounded-full", currentShift ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500")} />
                                        {currentShift && <div className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />}
                                    </div>
                                    <div className="flex flex-col leading-tight">
                                        <span className="text-[9px] uppercase tracking-widest text-slate-400">
                                            {user?.name || "Cashier"}
                                        </span>
                                        <span>{currentShift ? "SHIFT ACTIVE" : "NO SHIFT"}</span>
                                    </div>
                                    {currentShift && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 ml-2 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-lg"
                                            onClick={() => { setShiftModalType("CLOSE"); setShiftBalance(""); setIsShiftModalOpen(true); }}
                                        >
                                            <XCircle className="h-4 w-4" />
                                        </Button>
                                    )}
                                    {!currentShift && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 ml-2 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg"
                                            onClick={() => { setShiftModalType("OPEN"); setShiftBalance(""); setIsShiftModalOpen(true); }}
                                        >
                                            <CheckCircle2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>

                                {/* Fullscreen Toggle */}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className={cn(
                                        "h-9 w-9 rounded-md border-slate-200 transition-all shadow-sm shrink-0",
                                        isFullscreen ? "bg-primary text-white border-primary" : "bg-white text-slate-500 hover:text-primary"
                                    )}
                                    onClick={toggleFullscreen}
                                >
                                    <Fullscreen className="h-5 w-5" />
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="h-9 w-9 rounded-md bg-slate-900 flex items-center justify-center text-white cursor-pointer hover:bg-slate-800 transition-all shadow-lg group relative shrink-0">
                                            <SettingsIcon className="h-4 w-4 opacity-70 group-hover:rotate-90 transition-transform" />
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 shadow-2xl border-slate-100">
                                        <DropdownMenuLabel className="flex flex-col gap-1 p-3">
                                            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Terminal Info</span>
                                            <span className="text-sm font-black text-slate-900">{company?.name || "Premium POS"}</span>
                                            <span className="text-[10px] font-bold text-slate-400">ID: {companyId} | POS-T01</span>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-slate-50" />
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer" onClick={() => setIsHoldsModalOpen(true)}>
                                            <History className="h-4 w-4 mr-3 text-slate-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">Held Sales</span>
                                                <span className="text-[10px] text-slate-400">Recall parked transactions</span>
                                            </div>
                                        </DropdownMenuItem>

                                        <MySalesModal
                                            companyId={companyId}
                                            company={company}
                                            posSettings={posSettings}
                                            user={user}
                                            trigger={
                                                <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer" onSelect={(e) => e.preventDefault()}>
                                                    <Receipt className="h-4 w-4 mr-3 text-slate-500" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">My Sales</span>
                                                        <span className="text-[10px] text-slate-400">View & Reprint Receipts</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            }
                                        />


                                        {currentShift ? (
                                            <DropdownMenuItem className="p-3 rounded-xl focus:bg-red-50 cursor-pointer text-red-600" onClick={() => { setShiftModalType("CLOSE"); setShiftBalance(""); setIsShiftModalOpen(true); }}>
                                                <XCircle className="h-4 w-4 mr-3" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">End Shift</span>
                                                    <span className="text-[10px] opacity-70">Close register & Z-Report</span>
                                                </div>
                                            </DropdownMenuItem>
                                        ) : (
                                            <DropdownMenuItem className="p-3 rounded-xl focus:bg-emerald-50 cursor-pointer text-emerald-600" onClick={() => { setShiftModalType("OPEN"); setShiftBalance(""); setIsShiftModalOpen(true); }}>
                                                <Play className="h-4 w-4 mr-3" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold">Open Shift</span>
                                                    <span className="text-[10px] opacity-70">Start new service period</span>
                                                </div>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator className="bg-slate-50" />
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-blue-50 cursor-pointer" onClick={handleReprintLast}>
                                            <Printer className="h-4 w-4 mr-3 text-blue-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">Reprint Last Receipt</span>
                                                <span className="text-[10px] text-slate-400">Reprint most recent sale</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-amber-50 cursor-pointer" onClick={() => { setCnType("credit"); setIsCreditNoteOpen(true); }}>
                                            <FileText className="h-4 w-4 mr-3 text-amber-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">Credit / Debit Note</span>
                                                <span className="text-[10px] text-slate-400">Issue return or adjustment</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-purple-50 cursor-pointer" onClick={() => handleLoadReport("x")}>
                                            <LayoutGrid className="h-4 w-4 mr-3 text-purple-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold">X-Report</span>
                                                <span className="text-[10px] text-slate-400">Current day summary</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-slate-50" />
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer text-slate-400" onClick={() => setIsSettingsOpen(true)}>
                                            <SettingsIcon className="h-4 w-4 mr-3" />
                                            <span className="text-sm font-bold">Device Settings</span>
                                        </DropdownMenuItem>
                                        <div className="h-px bg-slate-50 my-1" />
                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-red-50 cursor-pointer text-red-600" onClick={() => logout()}>
                                            <LogOut className="h-4 w-4 mr-3" />
                                            <span className="text-sm font-bold">Log out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {/* Persistent Total Indicator for Scannability */}
                                <div className="h-11 px-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 shadow-sm ml-2">
                                    <Calculator className="h-4 w-4 text-emerald-600" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 leading-none">Total Payable</span>
                                        <span className="text-base font-black text-emerald-700 leading-none mt-1">{fmt(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden pb-0 md:pb-0 h-full relative">
                    {/* Products Grid */}
                    <div className={cn(
                        "flex-1 flex flex-col overflow-hidden p-2 md:p-4",
                        activeView === "cart" ? "hidden md:flex" : "flex"
                    )}>
                        {/* Product Filter/Tabs (High End Pills) - Hidden on Mobile now */}
                        <div className={cn(
                            "flex gap-2 overflow-x-auto pb-4 scrollbar-hide shrink-0 px-1 mt-1 hidden md:flex",
                            activeView === "cart" ? "hidden md:flex" : "hidden md:flex"
                        )}>
                            {categories.map(cat => (
                                <Button
                                    key={cat}
                                    variant={selectedCategory === cat ? "default" : "outline"}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "rounded-xl whitespace-nowrap h-9 md:h-11 px-4 md:px-6 text-xs md:text-sm font-bold transition-all border-none shadow-sm",
                                        selectedCategory === cat
                                            ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105"
                                            : "bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                    )}
                                    size="sm"
                                >
                                    {cat}
                                </Button>
                            ))}
                        </div>

                        <ScrollArea className="flex-1 -mx-2 px-2">
                            {isLoadingProducts && resolvedProducts.length === 0 ? (
                                <div className="flex items-center justify-center min-h-[400px]">
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                        <p className="text-slate-400 font-medium">Loading Inventory...</p>
                                    </div>
                                </div>
                            ) : resolvedProducts.length === 0 ? (
                                <div className="flex items-center justify-center min-h-[400px]">
                                    <div className="flex flex-col items-center gap-4 text-center px-6">
                                        <Package className="h-12 w-12 text-slate-200" />
                                        <div>
                                            <p className="text-slate-500 font-bold text-sm">No products available</p>
                                            {!isOnline && (
                                                <p className="text-amber-600 text-xs mt-1 font-medium">
                                                    Offline — no cached products found.<br />
                                                    Connect to internet and log in online to cache products.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Mobile View */}
                                    <div className="md:hidden grid grid-cols-3 gap-1 pb-24 px-1 select-none touch-manipulation">
                                        {(pagedProducts as any[]).map(product => {
                                            const hash = product.name.split("").reduce((acc: number, char: string) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                                            const hue = Math.abs(hash % 360);
                                            const bgColor = `hsl(${hue}, 70%, 95%)`;
                                            const iconColor = `hsl(${hue}, 60%, 60%)`;
                                            return (
                                                <div
                                                    key={product.id}
                                                    className="bg-white p-1 rounded-lg border border-slate-100/50 shadow-sm flex flex-col gap-1 active:scale-90 transition-all relative overflow-hidden group"
                                                    onClick={() => addToCart(product)}
                                                >
                                                    <div className="aspect-[4/5] rounded-md flex items-center justify-center shrink-0 relative overflow-hidden" style={{ backgroundColor: product.imageUrl ? '#f8fafc' : bgColor }}>
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Package className="h-4 w-4" style={{ color: iconColor }} />
                                                        )}
                                                        <div className="absolute inset-0 bg-primary/20 opacity-0 active:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Plus className="h-4 w-4 text-primary" />
                                                        </div>
                                                        {product.isTracked && Number(product.stockLevel) <= Number(product.lowStockThreshold) && (
                                                            <div className="absolute top-0.5 right-0.5 bg-red-500 text-[5px] font-black h-2.5 px-1 rounded-sm flex items-center text-white uppercase">OUT</div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-0.5 pb-0.5">
                                                        <h4 className="text-[8px] font-black text-slate-800 line-clamp-1 leading-tight px-0.5">{product.name}</h4>
                                                        <div className="flex items-center justify-between px-0.5">
                                                            <span className="text-[9px] font-black text-slate-900">{fmt(product.price)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop View */}
                                    <div className="hidden md:grid gap-2 pb-8" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 160px))" }}>
                                        {(pagedProducts as any[]).map(product => {
                                            const hash = product.name.split("").reduce((acc: number, char: string) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
                                            const hue = Math.abs(hash % 360);
                                            const bgColor = `hsl(${hue}, 70%, 95%)`;
                                            const iconColor = `hsl(${hue}, 60%, 60%)`;
                                            return (
                                                <Card
                                                    key={product.id}
                                                    className="cursor-pointer group relative overflow-hidden flex flex-col border border-slate-100 bg-white rounded-xl transition-all duration-200 hover:shadow-lg shadow-sm"
                                                    onClick={() => addToCart(product)}
                                                >
                                                    <CardContent className="p-0 flex flex-col h-full">
                                                        <div className="aspect-square max-h-24 flex items-center justify-center shrink-0 relative overflow-hidden" style={{ backgroundColor: product.imageUrl ? '#f8fafc' : bgColor }}>
                                                            {product.imageUrl ? (
                                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Package className="h-6 w-6 md:h-8 md:w-8" style={{ color: iconColor }} />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                                                                    <Plus className="h-5 w-5 text-primary" />
                                                                </div>
                                                            </div>
                                                            {product.isTracked && Number(product.stockLevel) <= Number(product.lowStockThreshold) && (
                                                                <Badge className="absolute top-2 right-2 bg-red-500 text-[8px] font-black h-4 px-1 border-none">OUT</Badge>
                                                            )}
                                                        </div>
                                                        <div className="p-2 flex flex-col flex-1 bg-white">
                                                            <h4 className="text-[10px] md:text-[11px] font-black text-slate-800 line-clamp-2 mb-1 group-hover:text-primary transition-colors leading-tight min-h-[1.5rem] md:min-h-[1.75rem]">{product.name}</h4>
                                                            <div className="flex justify-between items-center mt-auto">
                                                                <p className="text-xs md:text-sm font-black text-slate-900">
                                                                    {fmt(product.price)}
                                                                </p>
                                                                {product.isTracked && (
                                                                    <span className={cn(
                                                                        "text-[8px] md:text-[9px] font-bold",
                                                                        Number(product.stockLevel) <= Number(product.lowStockThreshold) ? "text-red-500" : "text-slate-400"
                                                                    )}>
                                                                        {Number(product.stockLevel)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Cart Sidebar/View */}
                    <div className={cn(
                        "flex flex-col w-full md:w-[350px] lg:w-[400px] border-l border-slate-200 bg-white md:relative absolute inset-0 z-40 md:z-auto bg-white mb-[70px] md:mb-0",
                        activeView === "products" ? "hidden md:flex" : "flex"
                    )}>
                        <CartSection />
                    </div>
                </div>

                {/* Mobile Bottom Navigation - Native App Style */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 h-[75px] bg-white/80 backdrop-blur-2xl border-t border-slate-100/50 flex items-center justify-around z-50 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] select-none">
                    <button
                        onClick={() => setActiveView("products")}
                        className={cn(
                            "flex flex-col items-center gap-1 transition-all duration-300 px-6 py-2 rounded-3xl relative",
                            activeView === "products" ? "text-primary" : "text-slate-400"
                        )}
                    >
                        {activeView === "products" && (
                            <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-in zoom-in-95 duration-200" />
                        )}
                        <LayoutGrid className={cn("h-5 w-5 relative z-10", activeView === "products" ? "fill-primary/20" : "")} />
                        <span className="text-[9px] font-black uppercase tracking-widest relative z-10">Products</span>
                    </button>

                    <button
                        onClick={() => setActiveView("cart")}
                        className={cn(
                            "flex flex-col items-center gap-1 transition-all duration-300 px-6 py-2 rounded-3xl relative",
                            activeView === "cart" ? "text-primary" : "text-slate-400"
                        )}
                    >
                        {activeView === "cart" && (
                            <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-in zoom-in-95 duration-200" />
                        )}
                        <div className="relative z-10">
                            <ShoppingCart className={cn("h-5 w-5", activeView === "cart" ? "fill-primary/20" : "")} />
                            {cart.length > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                                    {cart.reduce((a, b) => a + b.quantity, 0)}
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest relative z-10">Checkout</span>
                    </button>
                </div>

            </div>

            {/* Modals & Dialogs */}
            <div className="pos-modals">
                {/* High-End Elite Checkout Modal */}
                <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                    <DialogContent className="max-w-[95vw] h-auto my-auto md:max-w-[650px] p-0 overflow-hidden border-none rounded-[1.5rem] shadow-2xl flex flex-col">
                        <div className="flex flex-col md:flex-row h-full md:min-h-[400px]">
                            {/* Summary Side - Compact for all devices */}
                            <div className="md:flex-[0.8] bg-slate-900 text-white p-2 md:p-5 flex flex-row md:flex-col justify-between items-center md:items-stretch relative overflow-hidden shrink-0">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32" />

                                <div className="relative z-10 flex flex-col md:block">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 md:mb-3">Total Link</h3>
                                    <div className="hidden md:block space-y-2">
                                        <div className="flex justify-between items-center text-slate-300">
                                            <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
                                            <span className="font-mono text-sm">{fmt(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-300">
                                            <span className="text-xs font-bold uppercase tracking-widest">Tax (VAT)</span>
                                            <span className="font-mono text-sm">{fmt(taxAmount)}</span>
                                        </div>
                                        {orderDiscount > 0 && (
                                            <div className="flex justify-between items-center text-emerald-400">
                                                <span className="text-xs font-bold uppercase tracking-widest">Order Discount</span>
                                                <span className="font-mono text-sm">-{fmt(orderDiscount)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="relative z-10">
                                    <div className="hidden md:block h-px bg-slate-800 w-full mb-6 border-dashed" />
                                    <div
                                        className="flex flex-col gap-0 md:gap-1 cursor-pointer group/total"
                                        onClick={() => setPaidAmount((total * currencyInfo.rate).toFixed(2))}
                                        title="Click to pay exact amount"
                                    >
                                        <span className="hidden md:block text-[10px] font-black uppercase tracking-[0.4em] text-white group-hover/total:text-slate-200 transition-colors">Total Payable</span>
                                        <h2 className="text-base md:text-3xl font-black tracking-tighter leading-none text-white group-hover/total:scale-105 transition-transform origin-left text-right md:text-left">{fmt(total)}</h2>
                                        <p className="hidden md:block text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">ID: {companyId}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Input Side */}
                            <div className="flex-1 bg-white p-2 md:p-6 flex flex-col overflow-y-auto">
                                <div className="flex items-center justify-between mb-1.5 md:mb-4 shrink-0">
                                    <h3 className="text-[10px] md:text-base font-black text-slate-900 uppercase tracking-widest">Pay in {selectedCurrencyCode}</h3>
                                </div>

                                <div className="space-y-1.5 flex-1 flex flex-col">
                                    <div className="relative group shrink-0">
                                        <span className="absolute left-2.5 md:left-4 top-1/2 -translate-y-1/2 text-sm md:text-xl font-black text-slate-300 group-focus-within:text-primary transition-colors">$</span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={paidAmount}
                                            onChange={(e) => setPaidAmount(e.target.value)}
                                            className="h-7 md:h-12 pl-5 md:pl-8 text-sm md:text-xl font-black bg-slate-50 border-none rounded-md md:rounded-xl focus:ring-4 md:focus:ring-8 focus:ring-primary/5 transition-all text-slate-800"
                                        />
                                        <div className="absolute right-2.5 md:right-4 top-1/2 -translate-y-1/2 text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Rec.</div>
                                    </div>

                                    <div className="flex-1 md:flex-none">
                                        <Numpad value={paidAmount} onChange={setPaidAmount} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-1 md:gap-2 mt-1 md:mt-2 overflow-y-auto max-h-[80px] md:max-h-none shrink-0 border-t border-slate-50 pt-1">
                                        {[
                                            { id: 'CASH', icon: Banknote, label: 'Cash' },
                                            { id: 'CARD', icon: CreditCard, label: 'Card' },
                                            { id: 'ECOCASH', icon: CreditCard, label: 'EcoCash' },
                                            { id: 'usd', icon: Banknote, label: 'USD' },
                                            { id: 'zig', icon: Banknote, label: 'ZiG' }
                                        ].filter(m => {
                                            const allowed = (company?.posSettings as any)?.allowedPaymentMethods;
                                            // Show all if setting is missing (backward compatibility)
                                            if (!allowed || allowed.length === 0) return true;
                                            return allowed.includes(m.id);
                                        }).map(method => (
                                            <Button
                                                key={method.id}
                                                variant={paymentMethod === method.id ? 'default' : 'outline'}
                                                className={cn(
                                                    "h-6 md:h-10 rounded-md flex flex-col gap-0 md:gap-1 font-black uppercase tracking-widest text-[6px] md:text-[8px] transition-all",
                                                    paymentMethod === method.id
                                                        ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-[1.02]"
                                                        : "border-slate-100 text-slate-400 hover:bg-slate-50"
                                                )}
                                                onClick={() => setPaymentMethod(method.id as any)}
                                            >
                                                <method.icon className={cn("h-2 w-2 md:h-4 md:w-4", paymentMethod === method.id ? "text-primary" : "text-slate-200")} />
                                                {method.label}
                                            </Button>
                                        ))}
                                    </div>

                                    {paidAmount && (
                                        <div className="bg-emerald-50 p-1 md:p-3 rounded-md md:rounded-xl border border-emerald-100 flex items-center justify-between shrink-0">
                                            <div className="flex flex-col">
                                                <span className="text-[6px] uppercase font-black tracking-widest text-emerald-600">Change</span>
                                                <h3 className="text-sm md:text-xl font-black text-emerald-700">
                                                    {selectedCurrencyCode} {(parseFloat(paidAmount) - (total * Number(currencies?.find(c => c.code === selectedCurrencyCode)?.exchangeRate || 1))).toFixed(2)}
                                                </h3>
                                            </div>
                                            <div className="w-5 h-5 md:w-8 md:h-8 bg-white rounded-md flex items-center justify-center shadow-sm">
                                                <Banknote className="h-2.5 w-2.5 md:h-4 md:w-4 text-emerald-500" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 md:gap-3 mt-auto shrink-0 pb-2 md:pb-0">
                                        <Button
                                            variant="ghost"
                                            className="flex-1 h-7 md:h-10 rounded-lg font-black uppercase tracking-widest text-[8px] text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => setIsCheckoutOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            disabled={isProcessing || !paidAmount}
                                            className="flex-[2] h-7 md:h-10 rounded-lg bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[8px] shadow-xl shadow-primary/20 transition-all active:scale-95"
                                            onClick={processOrder}
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Held Sales (Restored with Elite Styling) */}
                <Dialog open={isHoldsModalOpen} onOpenChange={setIsHoldsModalOpen}>
                    <DialogContent className="sm:max-w-[500px] border-none rounded-[2rem] shadow-2xl p-0 overflow-hidden">
                        <div className="bg-slate-900 p-8 text-white">
                            <h3 className="text-xl font-black flex items-center gap-3">
                                <History className="h-6 w-6 text-primary" />
                                Held Transactions
                            </h3>
                            <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Resume or void parked sales</p>
                        </div>
                        <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto bg-slate-50">
                            {heldSales.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Pause className="h-6 w-6 text-slate-200" />
                                    </div>
                                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No held sales found</p>
                                </div>
                            ) : (
                                heldSales.map(hold => (
                                    <div key={hold.id} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:border-primary/30 transition-all group shadow-sm">
                                        <div>
                                            <p className="font-black text-slate-900">{hold.holdName}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(hold.createdAt).toLocaleTimeString()}</span>
                                                <Badge variant="secondary" className="h-5 text-[9px] bg-slate-100 text-slate-500 border-none font-black">
                                                    {hold.cartData.length} Items
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => resumeHold(hold)}
                                            className="h-10 px-5 gap-2 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs"
                                        >
                                            <Play className="h-3 w-3 text-primary" /> Resume
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Success/Confetti Modal */}
                {/* Advanced Shift Control Modal */}
                <Dialog open={isShiftModalOpen} onOpenChange={setIsShiftModalOpen}>
                    <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                        <div className={cn(
                            "p-8 text-white",
                            shiftModalType === "OPEN" ? "bg-emerald-600" : "bg-red-600"
                        )}>
                            <h3 className="text-xl font-black flex items-center gap-3">
                                {shiftModalType === "OPEN" ? <Play className="h-6 w-6 text-white" /> : <XCircle className="h-6 w-6 text-white" />}
                                {shiftModalType === "OPEN" ? "Open New Shift" : "Close Current Shift"}
                            </h3>
                            <p className="text-xs opacity-80 mt-2 font-bold uppercase tracking-widest text-white/70">
                                {shiftModalType === "OPEN" ? "Initialize register balance" : "Perform Z-Report & reconciliation"}
                            </p>
                        </div>
                        <div className="p-8 space-y-6 bg-white">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {shiftModalType === "OPEN" ? "Float / Opening Balance" : "Actual Counted Cash"}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">$</span>
                                    <Input
                                        type="number"
                                        value={shiftBalance}
                                        onChange={(e) => setShiftBalance(e.target.value)}
                                        className="h-14 pl-8 text-lg font-black bg-slate-50 border-none rounded-xl focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <Button
                                className={cn(
                                    "w-full h-14 rounded-xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 text-white",
                                    shiftModalType === "OPEN" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                                )}
                                onClick={shiftModalType === "OPEN" ? openShift : handleCloseShift}
                            >
                                {shiftModalType === "OPEN" ? "Start Service" : "Close Shift & Harmonize"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Terminal Settings Modal */}
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogContent className="sm:max-w-[450px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                        <div className="p-8 bg-slate-900 text-white">
                            <h3 className="text-xl font-black flex items-center gap-3">
                                <SettingsIcon className="h-6 w-6 text-primary" />
                                Terminal Settings
                            </h3>
                            <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest">Local POS Configuration</p>
                        </div>
                        <div className="p-8 space-y-6 bg-white">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-black text-slate-700">Auto-Print</Label>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Instant Receipt</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "h-10 px-4 rounded-xl font-black text-xs transition-all",
                                            posSettings.autoPrint ? "bg-primary text-white" : "text-slate-400"
                                        )}
                                        onClick={() => setPosSettings(prev => ({ ...prev, autoPrint: !prev.autoPrint }))}
                                    >
                                        {posSettings.autoPrint ? "ON" : "OFF"}
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-black text-slate-700">Silent (Proxy)</Label>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No Dialog</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "h-10 px-4 rounded-xl font-black text-xs transition-all",
                                            posSettings.silentPrinting ? "bg-emerald-500 text-white" : "text-slate-400"
                                        )}
                                        onClick={() => setPosSettings(prev => ({ ...prev, silentPrinting: !prev.silentPrinting }))}
                                    >
                                        {posSettings.silentPrinting ? "ON" : "OFF"}
                                    </Button>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Terminal ID</label>
                                    <Input
                                        value={posSettings.terminalId}
                                        onChange={(e) => setPosSettings(prev => ({ ...prev, terminalId: e.target.value }))}
                                        className="h-10 text-xs font-black bg-white border-slate-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Target Printer</label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[9px] font-black text-emerald-600 hover:bg-emerald-100"
                                            onClick={async () => {
                                                try {
                                                    const response = await fetch(`${posSettings.printServerUrl}/printers`);
                                                    if (response.ok) {
                                                        const data = await response.json();
                                                        setAvailablePrinters(Array.isArray(data) ? data : []);
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                }
                                            }}
                                        >
                                            <RefreshCw className="h-3 w-3 mr-1" /> Reload
                                        </Button>
                                    </div>
                                    <Select
                                        value={posSettings.printerName || "default"}
                                        onValueChange={(val) => setPosSettings(prev => ({ ...prev, printerName: val === "default" ? "" : val }))}
                                    >
                                        <SelectTrigger className="h-10 text-xs font-black bg-white border-emerald-200 rounded-lg outline-none">
                                            <SelectValue placeholder="Select Printer (or Default)" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-emerald-200">
                                            <SelectItem value="default" className="text-xs font-bold">System Default</SelectItem>
                                            {availablePrinters.map((p: any) => (
                                                <SelectItem key={p.name} value={p.name} className="text-xs font-bold">
                                                    {p.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[9px] text-emerald-600/60 font-bold uppercase tracking-tight mt-2 italic px-1">
                                        Tip: Select your physical POS printer if "Default" fails.
                                    </p>
                                </div>
                            </div>
                            <Button className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest transition-all active:scale-95" onClick={() => setIsSettingsOpen(false)}>
                                Save & Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Success/Confetti Modal */}
                <Dialog open={!!lastSuccessfulInvoice} onOpenChange={() => { setLastSuccessfulInvoice(null); setActiveView("products"); }}>
                    <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-[3rem] shadow-2xl">
                        <div className="bg-emerald-500 p-12 text-center text-white relative print:hidden">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className={cn("w-24 h-24 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 shadow-2xl ring-4 ring-white/10 scale-110", lastSuccessfulInvoice?._offline ? 'bg-amber-500/30' : 'bg-white/20')}>
                                    {lastSuccessfulInvoice?._offline ? <WifiOff className="h-12 w-12 text-white" /> : <CheckCircle2 className="h-12 w-12 text-white" />}
                                </div>
                                <h3 className="text-3xl font-black leading-tight mb-2">{lastSuccessfulInvoice?._offline ? 'Saved Offline' : 'Sale Perfect!'}</h3>
                                <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest">
                                    {lastSuccessfulInvoice?._offline
                                        ? 'Will sync when reconnected'
                                        : lastSuccessfulInvoice?.fiscalCode
                                            ? 'Transaction Fiscalized'
                                            : 'Sale Complete'}
                                </p>
                            </div>
                        </div>

                        <div className="p-10 bg-white space-y-8 flex flex-col items-center">

                            <div className="hidden print:block w-full">
                                <Receipt48
                                    invoice={lastSuccessfulInvoice}
                                    company={resolvedCompany}
                                    customer={resolvedCustomers?.find((c: any) => c.id === lastSuccessfulInvoice?.customerId)}
                                    items={lastSuccessfulInvoice?.items}
                                    user={user}
                                />
                            </div>

                            <div className="flex flex-col gap-3 w-full print:hidden">
                                {posSettings.printingEnabled && (
                                    <Button className="h-16 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"
                                        onClick={() => posSettings.silentPrinting ? handleSilentPrint() : window.print()}>
                                        <Printer className="h-5 w-5" />
                                        {posSettings.silentPrinting ? "Silent Print" : "Print Receipt"}
                                    </Button>
                                )}
                                <Button variant="ghost" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:text-primary hover:bg-primary/5 active:scale-95" onClick={() => { setLastSuccessfulInvoice(null); setActiveView("products"); }}>
                                    Proceed to Next Customer
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Hidden Receipt for Silent Printing */}
            <div className="fixed -left-[9999px] top-0 pointer-events-none overflow-hidden" style={{ width: '80mm' }}>
                {lastSuccessfulInvoice && (
                    <Receipt48
                        id="silent-receipt-48"
                        invoice={lastSuccessfulInvoice}
                        company={resolvedCompany}
                        customer={resolvedCustomers?.find((c: any) => c.id === lastSuccessfulInvoice?.customerId)}
                        items={lastSuccessfulInvoice?.items}
                        user={user}
                    />
                )}
            </div>

            {/* Hidden Reprint Receipt */}
            <div className="fixed -left-[9999px] top-0 pointer-events-none overflow-hidden" style={{ width: '80mm' }}>
                {reprintInvoice && (
                    <Receipt48
                        id="reprint-receipt-48"
                        invoice={reprintInvoice}
                        company={resolvedCompany}
                        customer={resolvedCustomers?.find((c: any) => c.id === reprintInvoice?.customerId)}
                        items={reprintInvoice?.items}
                        originalInvoice={reprintInvoice?.originalInvoice}
                        user={user}
                    />
                )}
            </div>

            {/* Reprint — single receipt confirm */}
            <Dialog open={!!reprintInvoice} onOpenChange={() => setReprintInvoice(null)}>
                <DialogContent className="sm:max-w-[400px] rounded-3xl p-0 overflow-hidden border-none">
                    <div className="bg-slate-900 p-6 text-white relative">
                        <button onClick={() => setReprintInvoice(null)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                            <XCircle className="h-4 w-4 text-white" />
                        </button>
                        <Printer className="h-8 w-8 mb-2 text-white/70" />
                        <h3 className="text-lg font-black">Reprint Receipt</h3>
                        <p className="text-slate-400 text-xs mt-0.5 font-bold">{reprintInvoice?.invoiceNumber}</p>
                    </div>
                    <div className="p-6 bg-white space-y-3">
                        <div className="text-sm text-slate-600 space-y-1.5">
                            <div className="flex justify-between"><span className="font-bold text-slate-400">Customer</span><span className="font-black">{resolvedCustomers?.find((c: any) => c.id === reprintInvoice?.customerId)?.name || "Walk-in"}</span></div>
                            <div className="flex justify-between"><span className="font-bold text-slate-400">Total</span><span className="font-black text-emerald-600">{fmt(Number(reprintInvoice?.total || 0))}</span></div>
                            <div className="flex justify-between"><span className="font-bold text-slate-400">Payment</span><span className="font-black">{reprintInvoice?.paymentMethod}</span></div>
                            <div className="flex justify-between"><span className="font-bold text-slate-400">Type</span><span className="font-black">{reprintInvoice?.transactionType || "Invoice"}</span></div>
                        </div>
                        <Button className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest"
                            onClick={() => {
                                if (posSettings.silentPrinting) {
                                    const el = document.getElementById('reprint-receipt-48');
                                    if (el && window.electronAPI) window.electronAPI.printReceipt(el.outerHTML, posSettings.printerName || undefined);
                                    else window.print();
                                } else { window.print(); }
                            }}>
                            <Printer className="h-4 w-4 mr-2" /> Print
                        </Button>
                        <Button variant="ghost" className="w-full h-10 rounded-xl font-black text-xs text-slate-400" onClick={() => setReprintInvoice(null)}>Back to List</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Today's Receipts List */}
            <Dialog open={isReprintOpen} onOpenChange={v => { setIsReprintOpen(v); if (!v) setReprintList([]); }}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden border-none max-h-[85vh] flex flex-col">
                    <div className="bg-slate-900 p-6 text-white relative shrink-0">
                        <button onClick={() => setIsReprintOpen(false)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                            <XCircle className="h-4 w-4 text-white" />
                        </button>
                        <Printer className="h-8 w-8 mb-2 text-white/70" />
                        <h3 className="text-lg font-black">Today's Receipts</h3>
                        <p className="text-slate-400 text-xs mt-0.5 font-bold">Select a receipt to reprint</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 bg-white space-y-2">
                        {reprintListLoading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                            </div>
                        )}
                        {!reprintListLoading && reprintList.length === 0 && (
                            <div className="text-center py-12">
                                <Receipt className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-400 font-bold text-sm">No receipts today</p>
                            </div>
                        )}
                        {reprintList.map((inv: any) => (
                            <button key={inv.id}
                                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
                                onClick={() => { setReprintInvoice(inv); setIsReprintOpen(false); }}>
                                <div>
                                    <p className="text-sm font-black text-slate-800">{inv.invoiceNumber}</p>
                                    <p className="text-xs text-slate-400 font-bold">
                                        {resolvedCustomers?.find((c: any) => c.id === inv.customerId)?.name || "Walk-in"} · {inv.paymentMethod}
                                    </p>
                                    <p className="text-[10px] text-slate-300 font-bold">{new Date(inv.createdAt).toLocaleTimeString()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-emerald-600">{fmt(Number(inv.total))}</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{inv.transactionType || "Invoice"}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                        <Button variant="ghost" className="w-full h-10 rounded-xl font-black text-xs text-slate-400" onClick={() => setIsReprintOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Credit / Debit Note Modal */}
            <Dialog open={isCreditNoteOpen} onOpenChange={setIsCreditNoteOpen}>
                <DialogContent className="sm:max-w-[520px] rounded-3xl p-0 overflow-hidden border-none max-h-[85vh] flex flex-col">
                    <div className="bg-amber-500 p-6 text-white relative shrink-0">
                        <button onClick={() => { setIsCreditNoteOpen(false); setCnSearchResults([]); setCnSearchQuery(""); }} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                            <XCircle className="h-4 w-4 text-white" />
                        </button>
                        <FileText className="h-8 w-8 mb-2 text-white/80" />
                        <h3 className="text-xl font-black">Issue Credit / Debit Note</h3>
                        <p className="text-amber-100 text-xs mt-1">Search for the original invoice to reverse or adjust</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-white space-y-4">
                        {/* Note type toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {(["credit", "debit"] as const).map(t => (
                                <button key={t} onClick={() => setCnType(t)}
                                    className={cn("flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                        cnType === t ? "bg-white text-amber-600 shadow-sm" : "text-slate-400")}>
                                    {t === "credit" ? "Credit Note (Return)" : "Debit Note (Adjustment)"}
                                </button>
                            ))}
                        </div>
                        {/* Search */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Invoice number or customer name..."
                                value={cnSearchQuery}
                                onChange={e => setCnSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCnSearch()}
                                className="flex-1 h-10 rounded-xl border-slate-200 text-sm font-bold"
                            />
                            <Button onClick={handleCnSearch} disabled={cnSearching} className="h-10 px-4 rounded-xl font-black text-xs">
                                {cnSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                            </Button>
                        </div>
                        {/* Results */}
                        {cnSearchResults.length > 0 && (
                            <div className="space-y-2 max-h-[280px] overflow-y-auto">
                                {cnSearchResults.map((inv: any) => (
                                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-all">
                                        <div>
                                            <p className="text-sm font-black text-slate-800">{inv.invoiceNumber}</p>
                                            <p className="text-xs text-slate-400 font-bold">{inv.customerName || resolvedCustomers?.find((c: any) => c.id === inv.customerId)?.name || "Customer"} · {fmt(Number(inv.total))}</p>
                                            <p className="text-[10px] text-slate-300 font-bold">{inv.paymentMethod} · {new Date(inv.issueDate || inv.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <Button size="sm" disabled={cnProcessing}
                                            className="h-8 px-3 rounded-lg font-black text-xs bg-amber-500 hover:bg-amber-600 text-white"
                                            onClick={() => handleIssueCreditDebitNote(inv)}>
                                            {cnProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : `Issue ${cnType === "credit" ? "CN" : "DN"}`}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {cnSearchResults.length === 0 && cnSearchQuery && !cnSearching && (
                            <p className="text-center text-slate-400 text-sm font-bold py-4">No invoices found</p>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                        <Button variant="ghost" className="w-full h-10 rounded-xl font-black text-xs text-slate-400" onClick={() => { setIsCreditNoteOpen(false); setCnSearchResults([]); setCnSearchQuery(""); }}>Cancel</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* X / Z Report Modal */}
            <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
                <DialogContent className="sm:max-w-[560px] rounded-3xl p-0 overflow-hidden border-none max-h-[90vh] flex flex-col">
                    <div className="bg-purple-600 p-6 text-white relative shrink-0">
                        <button onClick={() => setIsReportOpen(false)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all">
                            <XCircle className="h-4 w-4 text-white" />
                        </button>
                        <div className="flex items-end justify-between pr-10">
                            <div>
                                <h3 className="text-xl font-black">{reportType === "x" ? "X-Report" : "Z-Report"}</h3>
                                <p className="text-purple-200 text-xs mt-1">{reportType === "x" ? "Current day summary" : "Closed day summary"}</p>
                            </div>
                            <div className="flex bg-purple-700/50 p-1 rounded-xl">
                                {(["x", "z"] as const).map(t => (
                                    <button key={t} onClick={() => handleLoadReport(t)}
                                        className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                            reportType === t ? "bg-white text-purple-600" : "text-purple-200")}>
                                        {t.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-white space-y-4">
                        {reportLoading && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                            </div>
                        )}
                        {reportData?.error && (
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-center">
                                <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                                <p className="text-sm font-black text-red-600">{reportData.error}</p>
                            </div>
                        )}
                        {reportData && !reportData.error && (
                            <>
                                {/* POS Sales Summary — always shown */}
                                {reportData.posSummary && (
                                    <div className="border border-purple-100 rounded-2xl overflow-hidden">
                                        <div className="bg-purple-600 px-4 py-2 flex items-center justify-between">
                                            <span className="text-xs font-black text-white uppercase tracking-widest">Today's Sales Summary</span>
                                            <span className="text-xs font-black text-purple-200">{reportData.posSummary.totalTransactions} transactions</span>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {reportData.posSummary.byPaymentMethod.map((pm: any) => (
                                                <div key={pm.method} className="flex items-center justify-between px-4 py-3">
                                                    <span className="text-sm font-bold text-slate-600">{pm.method}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs font-black text-slate-400">{pm.count} sales</span>
                                                        <span className="text-sm font-black text-emerald-600">{Number(pm.total).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                                                <span className="text-sm font-black text-slate-800">Grand Total</span>
                                                <span className="text-base font-black text-slate-900">{Number(reportData.posSummary.grandTotal).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Fiscal header info — only when fiscal day data is present */}
                                {reportData.fiscalDayNo && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fiscal Day</p>
                                            <p className="text-2xl font-black text-slate-800">#{reportData.fiscalDayNo}</p>
                                        </div>
                                        <div className="bg-slate-50 rounded-2xl p-4">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Opened</p>
                                            <p className="text-sm font-black text-slate-800">{reportData.openedAt ? new Date(reportData.openedAt).toLocaleString() : "—"}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Doc stats by currency — only when non-empty */}
                                {(reportData.docStats || []).length > 0 && (reportData.docStats || []).map((stat: any) => (
                                    <div key={stat.currency} className="border border-slate-100 rounded-2xl overflow-hidden">
                                        <div className="bg-slate-800 px-4 py-2">
                                            <span className="text-xs font-black text-white uppercase tracking-widest">{stat.currency}</span>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {[
                                                { label: "Invoices", data: stat.invoices, color: "text-emerald-600" },
                                                { label: "Credit Notes", data: stat.creditNotes, color: "text-red-500" },
                                                { label: "Debit Notes", data: stat.debitNotes, color: "text-amber-500" },
                                            ].map(row => (
                                                <div key={row.label} className="flex items-center justify-between px-4 py-3">
                                                    <span className="text-sm font-bold text-slate-600">{row.label}</span>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-xs font-black text-slate-400">{row.data.quantity} docs</span>
                                                        <span className={cn("text-sm font-black", row.color)}>{stat.currency} {Number(row.data.total).toFixed(2)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                                                <span className="text-sm font-black text-slate-800">Total</span>
                                                <span className="text-base font-black text-slate-900">{stat.currency} {Number(stat.totalDocuments.total).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Fiscal counters — only when non-empty */}
                                {reportData.counters && reportData.counters.length > 0 && (
                                    <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                        <div className="bg-slate-100 px-4 py-2">
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Fiscal Counters</span>
                                        </div>
                                        <div className="divide-y divide-slate-50">
                                            {reportData.counters.map((c: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between px-4 py-2">
                                                    <span className="text-xs font-bold text-slate-500">{c.taxCode || c.taxPercent + "%"}</span>
                                                    <span className="text-xs font-black text-slate-800">{c.currency} {Number(c.taxAmount || 0).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0">
                        <Button variant="ghost" className="w-full h-10 rounded-xl font-black text-xs text-slate-400" onClick={() => setIsReportOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>

        </PosLayout >
    );

}
