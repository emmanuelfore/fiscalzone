import { PosLayout } from "@/components/pos-layout";
import { useCustomers, useCreateCustomer } from "@/hooks/use-customers";
import { useProducts } from "@/hooks/use-products";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useCurrencies } from "@/hooks/use-currencies";
import { useCompany } from "@/hooks/use-companies";
import { useTaxConfig } from "@/hooks/use-tax-config";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { useState, useMemo, useEffect } from "react";
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Banknote, UserPlus, Loader2, Package, Tag, Pause, Play, History, Calculator, Printer, CheckCircle2, XCircle, ChevronRight, Fullscreen, HelpCircle, User, Settings as SettingsIcon, LogOut, FileText, Receipt, Clock } from "lucide-react";
import { POSReceipt } from "@/components/pos-receipt";
import { Receipt48 } from "@/components/pos/receipt-48";
import { ManagerOverride } from "@/components/pos/manager-override";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
    const companyId = parseInt(localStorage.getItem("selectedCompanyId") || "0");
    const { data: company } = useCompany(companyId);
    const isCashier = (company as any)?.role === 'cashier';
    const { data: products, isLoading: isLoadingProducts } = useProducts(companyId);
    const { data: customers } = useCustomers(companyId);
    const { data: currencies } = useCurrencies(companyId);
    const { taxTypes } = useTaxConfig(companyId);
    const createInvoice = useCreateInvoice(companyId);
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
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [paidAmount, setPaidAmount] = useState<string>("");
    const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>("USD");

    // Barcode Listener State
    const [barcodeBuffer, setBarcodeBuffer] = useState("");
    const [lastCharTime, setLastCharTime] = useState(0);

    const [heldSales, setHeldSales] = useState<any[]>([]);
    const [isHoldsModalOpen, setIsHoldsModalOpen] = useState(false);
    const [currentShift, setCurrentShift] = useState<any>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftModalType, setShiftModalType] = useState<"OPEN" | "CLOSE">("OPEN");
    const [shiftBalance, setShiftBalance] = useState("");
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [posSettings, setPosSettings] = useState({
        autoPrint: true,
        terminalId: "POS-T01"
    });

    // Default to "Walk-in Customer"
    useEffect(() => {
        if (!selectedCustomerId && customers && customers.length > 0) {
            const walkIn = customers.find(c => c.name.toLowerCase().includes("walk-in") || c.name.toLowerCase().includes("guest"));
            if (walkIn) {
                setSelectedCustomerId(walkIn.id.toString());
            }
        }
    }, [customers, selectedCustomerId]);

    // Manager Override State
    const [pendingOverride, setPendingOverride] = useState<{ type: "DISCOUNT" | "VOID_CART", data: any } | null>(null);

    // Derived data
    const categories = useMemo(() => {
        if (!products) return ["All"];
        const cats = new Set(products.map(p => p.category || "Uncategorized"));
        return ["All", ...Array.from(cats)];
    }, [products]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

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
        if (product.isTracked) {
            const inCart = cart.find(item => item.productId === product.id)?.quantity || 0;
            if (inCart >= Number(product.stockLevel)) {
                toast({
                    title: "Out of Stock",
                    description: `Only ${product.stockLevel} units available for ${product.name}`,
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

    // Barcode Effect
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Ignore if in any input context EXCEPT the specific search if we want it to work globally
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const currentTime = Date.now();

            // If more than 50ms since last key, start new buffer (typical barcode speed)
            if (currentTime - lastCharTime > 50) {
                setBarcodeBuffer(e.key);
            } else {
                if (e.key === 'Enter') {
                    // Process barcode
                    const found = products?.find(p => p.barcode === barcodeBuffer || p.sku === barcodeBuffer);
                    if (found) {
                        addToCart(found);
                        toast({ title: "Scanned", description: `Added ${found.name}` });
                    }
                    setBarcodeBuffer("");
                } else {
                    setBarcodeBuffer(prev => prev + e.key);
                }
            }
            setLastCharTime(currentTime);
        };

        window.addEventListener('keypress', handleKeyPress);
        return () => window.removeEventListener('keypress', handleKeyPress);
    }, [barcodeBuffer, lastCharTime, products]);

    const updateQuantity = (productId: number, delta: number) => {
        const product = products?.find(p => p.id === productId);
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
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const fetchShift = async () => {
        const res = await apiFetch(`/api/pos/shifts/current?companyId=${companyId}`);
        if (res.ok) setCurrentShift(await res.json());
    };

    const fetchHeldSales = async () => {
        const res = await apiFetch(`/api/pos/holds?companyId=${companyId}`);
        if (res.ok) setHeldSales(await res.json());
    };

    const openShift = async () => {
        try {
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
            }
        } catch (e) {
            toast({ title: "Error", description: "Failed to open shift", variant: "destructive" });
        }
    };

    const handleCloseShift = async () => {
        if (!currentShift) return;
        try {
            const res = await apiFetch(`/api/pos/shifts/${currentShift.id}/close`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ closingBalance: shiftBalance || "0" })
            });
            if (res.ok) {
                toast({ title: "Shift Closed", description: "Z-Report generated successfully" });
                setCurrentShift(null);
                setIsShiftModalOpen(false);
                setShiftBalance("");
                fetchShift();
            }
        } catch (e) {
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
            const cashCustomer = customers?.find(c => c.name.toLowerCase().includes("cash") || c.name.toLowerCase().includes("walk-in"));
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
                description: `Received amount ($${paidAmount}) is less than total payable ($${total.toFixed(2)})`,
                variant: "destructive"
            });
            setIsProcessing(false);
            return;
        }

        try {
            const currency = currencies?.find(c => c.code === selectedCurrencyCode) || { code: "USD", exchangeRate: "1" };
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

            const result = await createInvoice.mutateAsync(invoiceData as any);
            setLastSuccessfulInvoice(result);
            setCart([]);
            setOrderDiscount(0);
            setSelectedCustomerId("");
            setPaidAmount("");
            setIsCheckoutOpen(false);
            toast({ title: "Success", description: "Order processed and fiscalized successfully" });
        } catch (error: any) {
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
            setCart([]);
            setSelectedCustomerId("");
            toast({ title: "Held", description: "Sale parked successfully" });
            fetchHeldSales();
        } catch (e: any) {
            toast({ title: "Error", description: "Failed to hold sale", variant: "destructive" });
        }
    };

    const resumeHold = async (hold: any) => {
        try {
            const res = await apiFetch(`/api/pos/holds/${hold.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to remove hold");

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
        if (company?.posSettings) {
            const settings = company.posSettings as any;
            setPosSettings(prev => ({
                ...prev,
                autoPrint: settings.autoPrint ?? true
            }));
        }
    }, [company]);

    // Auto-Print Effect
    useEffect(() => {
        if (lastSuccessfulInvoice && posSettings.autoPrint) {
            // Small delay to ensure Dialog content is rendered in the Portal
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [lastSuccessfulInvoice, posSettings.autoPrint]);

    // Set Default Customer
    useEffect(() => {
        const settings = company?.posSettings as any;
        if (settings?.defaultCustomerId && !selectedCustomerId && customers) {
            // Only set if exists in customers list
            const exists = customers.find(c => c.id.toString() === settings.defaultCustomerId);
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
        // Logic: If discount is being increased and is > 10% of subtotal, require override
        // Simple heuristic: if amount > 0 and amount > subtotal * 0.1
        if (amount > 0 && subtotal > 0 && amount > (subtotal * 0.1)) {
            setPendingOverride({ type: "DISCOUNT", data: amount });
        } else {
            setOrderDiscount(amount);
        }
    };

    const handleClearCart = () => {
        if (cart.length === 0) return;
        setPendingOverride({ type: "VOID_CART", data: null });
    };

    const handleOverrideSuccess = (manager: any) => {
        if (!pendingOverride) return;

        if (pendingOverride.type === "DISCOUNT") {
            setOrderDiscount(pendingOverride.data);
            toast({ title: "Discount Authorized", description: `Approved by ${manager.name}` });
        } else if (pendingOverride.type === "VOID_CART") {
            setCart([]);
            setOrderDiscount(0);
            setSelectedCustomerId("");
            toast({ title: "Cart Cleared", description: `Void approved by ${manager.name}` });
        }
        setPendingOverride(null);
    };


    // Tactile Numpad Component
    function Numpad({ value, onChange, onEnter }: { value: string, onChange: (val: string) => void, onEnter?: () => void }) {
        const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", ".", "DEL"];
        return (
            <div className="grid grid-cols-3 gap-1.5 p-3 bg-slate-50/50 rounded-2xl border border-slate-100">
                {buttons.map(btn => (
                    <Button
                        key={btn}
                        variant="ghost"
                        className={cn(
                            "h-12 font-black text-base rounded-xl transition-all active:scale-95",
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
            <div className="flex flex-col h-full bg-white relative">
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

                <ScrollArea className="flex-1 px-3 py-3">
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
                                            <span className="text-[11px] font-bold text-slate-400">${item.price.toFixed(2)}</span>
                                            {item.discountAmount > 0 && (
                                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1 rounded">-{item.discountAmount.toFixed(2)}</span>
                                            )}
                                            {products?.find(p => p.id === item.productId)?.isTracked && (
                                                <span className="text-[9px] font-black text-slate-300 bg-slate-50 px-1 rounded uppercase tracking-tighter">
                                                    Stock: {(products?.find(p => p.id === item.productId)?.stockLevel || 0) - (cart.find(c => c.productId === item.productId)?.quantity || 0)}
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

                {/* Tactical Footer */}
                <div className="p-4 bg-white border-t border-slate-100 space-y-4 shrink-0 shadow-[0_-20px_40px_-5px_rgba(0,0,0,0.03)] z-20">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Subtotal</span>
                            <span className="text-slate-600">${subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Tax (VAT)</span>
                            <span className="text-slate-600">${taxAmount.toFixed(2)}</span>
                        </div>

                        {orderDiscount > 0 && (
                            <div className="flex justify-between text-[10px] font-black text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100 items-center">
                                <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Discount</span>
                                <span>-${orderDiscount.toFixed(2)}</span>
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

                        <div className="flex justify-between items-center py-2 border-t border-slate-100 border-dashed mt-2">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Grand Total</span>
                            <div className="text-right">
                                <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">${total.toFixed(2)}</p>
                                <p className="text-[10px] font-bold text-emerald-600 mt-0.5 uppercase tracking-widest">{selectedCurrencyCode}</p>
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
                    title={pendingOverride?.type === "DISCOUNT" ? "Authorize Discount" : "Authorize Void"}
                    description={pendingOverride?.type === "DISCOUNT" ? "Manager PIN required for high discount" : "Manager PIN required to void cart"}
                />
                {/* High-End Command Center Header */}
                <div className="bg-white border-b border-slate-200/60 px-6 py-4 shrink-0 backdrop-blur-md sticky top-0 z-30 shadow-sm">
                    <div className="flex flex-col xl:flex-row gap-6 items-stretch xl:items-center">
                        {/* Brand & Context */}
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-black text-slate-900 leading-none">{company?.name || "Premium POS"}</h1>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-black mt-1">Elite Terminal</p>
                            </div>
                        </div>

                        <div className="h-8 w-px bg-slate-200 mx-2 hidden xl:block" />

                        {/* Elite Search Bar */}
                        <div className="relative flex-1 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                            </div>
                            <Input
                                placeholder="Search products, SKU or scan barcode..."
                                className="pl-12 h-14 bg-slate-50/50 border-slate-200/80 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all rounded-2xl text-base font-medium shadow-inner border-none xxl:text-lg"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <div className="h-8 px-2 bg-white border border-slate-200 rounded-lg flex items-center gap-1 text-[10px] font-black text-slate-400 shadow-sm">
                                    <kbd className="font-sans">ESC</kbd>
                                    <span>to clear</span>
                                </div>
                            </div>
                        </div>

                        {/* Integrated Controls & Profile */}
                        <div className="flex items-center gap-3 lg:gap-4 flex-wrap">
                            {/* Customer Selector - Premium */}
                            <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 w-10 rounded-xl bg-white shadow-sm border border-slate-200 text-slate-600 hover:text-primary hover:bg-white"
                                    onClick={() => {
                                        const walkIn = customers?.find(c => c.name.toLowerCase().includes("walk-in") || c.name.toLowerCase().includes("cash"));
                                        if (walkIn) setSelectedCustomerId(walkIn.id.toString());
                                        else toast({ title: "No Walk-in Customer", description: "Create 'Walk-in' first." });
                                    }}
                                >
                                    <UserPlus className="h-5 w-5" />
                                </Button>
                                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                    <SelectTrigger className="w-44 lg:w-56 h-10 border-none bg-transparent hover:bg-slate-200/30 transition-all font-bold text-slate-700">
                                        <div className="flex items-center gap-2 truncate">
                                            <User className="h-4 w-4 text-slate-400 shrink-0" />
                                            <SelectValue placeholder="Select Customer" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-slate-200 shadow-2xl">
                                        {customers?.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()} className="focus:bg-primary/5 rounded-lg py-2.5">
                                                <div className="font-bold text-slate-700">{c.name}</div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block" />

                            {/* Quick Action Pills */}
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    className="h-11 px-5 gap-2 border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold group"
                                    onClick={() => setIsHoldsModalOpen(true)}
                                >
                                    <div className="relative">
                                        <History className="h-4 w-4 text-slate-500 group-hover:rotate-[-45deg] transition-transform" />
                                        {heldSales.length > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 h-3 w-3 bg-primary rounded-full ring-2 ring-white" />
                                        )}
                                    </div>
                                    <span className="text-slate-600">Holds</span>
                                    <Badge variant="secondary" className="ml-1 h-5 bg-slate-100 text-slate-500 border-none px-1.5 font-black text-[10px]">
                                        {heldSales.length}
                                    </Badge>
                                </Button>

                                <div className={cn(
                                    "flex items-center gap-3 px-4 h-11 rounded-2xl border text-xs font-black shrink-0 shadow-sm",
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
                                        "h-11 w-11 rounded-2xl border-slate-200 transition-all shadow-sm",
                                        isFullscreen ? "bg-primary text-white border-primary" : "bg-white text-slate-500 hover:text-primary"
                                    )}
                                    onClick={toggleFullscreen}
                                >
                                    <Fullscreen className="h-5 w-5" />
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="h-11 w-11 rounded-2xl bg-slate-900 flex items-center justify-center text-white cursor-pointer hover:bg-slate-800 transition-all shadow-lg group relative">
                                            <SettingsIcon className="h-5 w-5 opacity-70 group-hover:rotate-90 transition-transform" />
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

                                        <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer" onClick={() => window.open('/pos/my-sales', '_blank')}>
                                            <Receipt className="h-4 w-4 mr-3 text-slate-500" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">My Sales</span>
                                                <span className="text-[10px] text-slate-400">View & Reprint Receipts</span>
                                            </div>
                                        </DropdownMenuItem>

                                        {!isCashier && (
                                            <>
                                                <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer" onClick={() => window.open('/pos/reports', '_blank')}>
                                                    <FileText className="h-4 w-4 mr-3 text-slate-500" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">Analytics Reports</span>
                                                        <span className="text-[10px] text-slate-400">Daily Trends & Insights</span>
                                                    </div>
                                                </DropdownMenuItem>

                                                <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer" onClick={() => window.open('/pos/all-sales', '_blank')}>
                                                    <History className="h-4 w-4 mr-3 text-slate-500" />
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">Sales Ledger</span>
                                                        <span className="text-[10px] text-slate-400">Detailed Transaction Log</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            </>
                                        )}

                                        {currentShift && (
                                            <DropdownMenuItem className="p-3 rounded-xl focus:bg-slate-50 cursor-pointer" onClick={() => { /* Open Cash Drop Modal */ }}>
                                                <Banknote className="h-4 w-4 mr-3 text-slate-500" />
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">Cash Management</span>
                                                    <span className="text-[10px] text-slate-400">Drops & Payouts</span>
                                                </div>
                                            </DropdownMenuItem>
                                        )}
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
                                        <span className="text-base font-black text-emerald-700 leading-none mt-1">${total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Products Grid */}
                    <div className="flex-1 flex flex-col overflow-hidden p-4">
                        <div className="flex gap-3 overflow-x-auto pb-6 scrollbar-hide shrink-0 px-2 mt-2">
                            {categories.map(cat => (
                                <Button
                                    key={cat}
                                    variant={selectedCategory === cat ? "default" : "outline"}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "rounded-2xl whitespace-nowrap h-11 px-6 text-sm font-bold transition-all border-none shadow-sm",
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
                            {isLoadingProducts ? (
                                <div className="flex items-center justify-center min-h-[400px]">
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                        <p className="text-slate-400 font-medium">Loading Inventory...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 pb-8">
                                    {(filteredProducts as any[]).map(product => {
                                        // Generate pastel color based on product name
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
                                                    {/* Image Container with Glass Overlay */}
                                                    <div className="aspect-square flex items-center justify-center shrink-0 relative overflow-hidden" style={{ backgroundColor: product.imageUrl ? '#f8fafc' : bgColor }}>
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Package className="h-8 w-8" style={{ color: iconColor }} />
                                                            </div>
                                                        )}

                                                        {/* Compact Hover Overlay */}
                                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
                                                                <Plus className="h-5 w-5 text-primary" />
                                                            </div>
                                                        </div>

                                                        {product.isTracked && Number(product.stockLevel) <= Number(product.lowStockThreshold) && (
                                                            <Badge className="absolute top-2 right-2 bg-red-500 text-[8px] font-black h-4 px-1 border-none">OUT</Badge>
                                                        )}
                                                    </div>

                                                    {/* Product Info */}
                                                    <div className="p-2.5 flex flex-col flex-1 bg-white">
                                                        <h4 className="text-[11px] font-black text-slate-800 line-clamp-2 mb-1 group-hover:text-primary transition-colors leading-tight min-h-[1.75rem]">{product.name}</h4>
                                                        <div className="flex justify-between items-center mt-auto">
                                                            <p className="text-sm font-black text-slate-900">
                                                                <span className="text-[10px] text-slate-400 mr-0.5">$</span>
                                                                {Number(product.price).toFixed(2)}
                                                            </p>
                                                            {product.isTracked && (
                                                                <span className={cn(
                                                                    "text-[9px] font-bold",
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
                            )}
                        </ScrollArea>
                    </div>

                    {/* Cart Sidebar (Desktop) */}
                    <div className="hidden md:flex flex-col w-[350px] lg:w-[400px] border-l border-slate-200 bg-white">
                        <CartSection />
                    </div>
                </div>

                {/* Mobile Cart Trigger */}
                <div className="md:hidden fixed bottom-6 right-6 z-50">
                    <Sheet open={isMobileCartOpen} onOpenChange={setIsMobileCartOpen}>
                        <SheetTrigger asChild>
                            <Button size="lg" className="rounded-full h-16 w-16 shadow-2xl bg-primary hover:bg-primary/90 text-white p-0">
                                <div className="relative">
                                    <ShoppingCart className="h-8 w-8" />
                                    {cart.length > 0 && (
                                        <Badge className="absolute -top-3 -right-3 h-6 min-w-6 flex items-center justify-center p-1 rounded-full border-2 border-white shadow-md font-bold" variant="destructive">
                                            {cart.reduce((a, b) => a + b.quantity, 0)}
                                        </Badge>
                                    )}
                                </div>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="p-0 w-full sm:max-w-md border-l-0">
                            <CartSection />
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Modals & Dialogs */}
            <div className="pos-modals">
                {/* High-End Elite Checkout Modal */}
                <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                    <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl">
                        <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
                            {/* Summary Side */}
                            <div className="flex-1 bg-slate-900 text-white p-8 flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] -mr-32 -mt-32" />

                                <div className="relative z-10">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6">Payment Summary</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-slate-300">
                                            <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
                                            <span className="font-mono text-sm">${subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-slate-300">
                                            <span className="text-xs font-bold uppercase tracking-widest">Tax (VAT)</span>
                                            <span className="font-mono text-sm">${taxAmount.toFixed(2)}</span>
                                        </div>
                                        {orderDiscount > 0 && (
                                            <div className="flex justify-between items-center text-emerald-400">
                                                <span className="text-xs font-bold uppercase tracking-widest">Order Discount</span>
                                                <span className="font-mono text-sm">-${orderDiscount.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-auto relative z-10">
                                    <div className="h-px bg-slate-800 w-full mb-6 border-dashed" />
                                    <div
                                        className="flex flex-col gap-1 cursor-pointer group/total"
                                        onClick={() => setPaidAmount(total.toFixed(2))}
                                        title="Click to pay exact amount"
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white group-hover/total:text-slate-200 transition-colors">Total Payable</span>
                                        <h2 className="text-5xl font-black tracking-tighter leading-none text-white group-hover/total:scale-105 transition-transform origin-left">${total.toFixed(2)}</h2>
                                        <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">ID: {companyId}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Input Side */}
                            <div className="flex-1 bg-white p-8 flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-black text-slate-900">Checkout</h3>
                                    <div className="flex gap-1.5">
                                        {['USD', 'ZWG'].map(cc => (
                                            <Button
                                                key={cc}
                                                variant={selectedCurrencyCode === cc ? 'default' : 'outline'}
                                                className={cn(
                                                    "h-8 px-3 rounded-lg font-black text-[10px] transition-all",
                                                    selectedCurrencyCode === cc ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 border-slate-100"
                                                )}
                                                onClick={() => setSelectedCurrencyCode(cc)}
                                            >
                                                {cc}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="relative group">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-slate-300 group-focus-within:text-primary transition-colors">$</span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            value={paidAmount}
                                            onChange={(e) => setPaidAmount(e.target.value)}
                                            className="h-16 pl-10 text-2xl font-black bg-slate-50 border-none rounded-2xl focus:ring-8 focus:ring-primary/5 transition-all text-slate-800"
                                        />
                                        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Amount Received</div>
                                    </div>

                                    <Numpad value={paidAmount} onChange={setPaidAmount} />

                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        {[
                                            { id: 'CASH', icon: Banknote, label: 'Cash' },
                                            { id: 'CARD', icon: CreditCard, label: 'Card' },
                                            { id: 'ECOCASH', icon: CreditCard, label: 'EcoCash' },
                                            { id: 'usd', icon: Banknote, label: 'USD Cash' },
                                            { id: 'zig', icon: Banknote, label: 'ZiG Cash' }
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
                                                    "h-16 rounded-2xl flex flex-col gap-1.5 font-black uppercase tracking-widest text-[9px] transition-all",
                                                    paymentMethod === method.id
                                                        ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-[1.02]"
                                                        : "border-slate-100 text-slate-400 hover:bg-slate-50"
                                                )}
                                                onClick={() => setPaymentMethod(method.id as any)}
                                            >
                                                <method.icon className={cn("h-5 w-5", paymentMethod === method.id ? "text-primary" : "text-slate-200")} />
                                                {method.label}
                                            </Button>
                                        ))}
                                    </div>

                                    {paidAmount && (
                                        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] uppercase font-black tracking-widest text-emerald-600 mb-1">Change to return</span>
                                                <h3 className="text-2xl font-black text-emerald-700">
                                                    {selectedCurrencyCode} {(parseFloat(paidAmount) - (total * Number(currencies?.find(c => c.code === selectedCurrencyCode)?.exchangeRate || 1))).toFixed(2)}
                                                </h3>
                                            </div>
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                                <Banknote className="h-5 w-5 text-emerald-500" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-4 pt-2 mt-auto">
                                        <Button
                                            variant="ghost"
                                            className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => setIsCheckoutOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            disabled={isProcessing || !paidAmount}
                                            className="flex-[2] h-12 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all active:scale-95"
                                            onClick={processOrder}
                                        >
                                            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Sale"}
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
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-700">Auto-Print Receipt</span>
                                        <span className="text-[10px] text-slate-400">Print immediately after checkout</span>
                                    </div>
                                    <Button
                                        variant={posSettings.autoPrint ? "default" : "outline"}
                                        size="sm"
                                        className={cn(
                                            "rounded-lg h-8 px-3 font-black text-[10px]",
                                            posSettings.autoPrint ? "bg-primary text-white" : "text-slate-400"
                                        )}
                                        onClick={() => setPosSettings(prev => ({ ...prev, autoPrint: !prev.autoPrint }))}
                                    >
                                        {posSettings.autoPrint ? "ON" : "OFF"}
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
                            </div>
                            <Button className="w-full h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest transition-all active:scale-95" onClick={() => setIsSettingsOpen(false)}>
                                Save & Close
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Success/Confetti Modal */}
                <Dialog open={!!lastSuccessfulInvoice} onOpenChange={() => setLastSuccessfulInvoice(null)}>
                    <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-[3rem] shadow-2xl">
                        <div className="bg-emerald-500 p-12 text-center text-white relative print:hidden">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 shadow-2xl ring-4 ring-white/10 scale-110">
                                    <CheckCircle2 className="h-12 w-12 text-white" />
                                </div>
                                <h3 className="text-3xl font-black leading-tight mb-2">Sale Perfect!</h3>
                                <p className="text-emerald-100 text-sm font-bold uppercase tracking-widest">Transaction Fiscalized</p>
                            </div>
                        </div>

                        <div className="p-10 bg-white space-y-8 flex flex-col items-center">

                            <div className="hidden print:block w-full">
                                <Receipt48
                                    invoice={lastSuccessfulInvoice}
                                    company={company}
                                    customer={customers?.find(c => c.id === lastSuccessfulInvoice?.customerId)}
                                    items={lastSuccessfulInvoice?.items}
                                    user={user}
                                />
                            </div>

                            <div className="flex flex-col gap-3 w-full print:hidden">
                                <Button className="h-16 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3" onClick={() => window.print()}>
                                    <Printer className="h-5 w-5" />
                                    Print Receipt
                                </Button>
                                <Button variant="ghost" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-400 hover:text-primary hover:bg-primary/5" onClick={() => setLastSuccessfulInvoice(null)}>
                                    Proceed to Next Customer
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </PosLayout>
    );

}
