import { Layout } from "@/components/layout";
import { useCompanies, useUpdateCompany } from "@/hooks/use-companies";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, ShieldCheck, Save, Printer, Key, UserPlus, Trash2, Wrench, AlertTriangle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useCustomers } from "@/hooks/use-customers";

export default function PosSettingsPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { activeCompany: currentCompany, isLoading: isLoadingCompany } = useActiveCompany();
    const companyId = currentCompany?.id || 0;

    const updateCompany = useUpdateCompany(companyId);

    interface PosSettings {
        autoPrint: boolean;
        terminalId: string;
        receiptHeader: string;
        receiptFooter: string;
        showLogo: boolean;
        allowSellOutOfStock: boolean;
        allowedPaymentMethods: string[];
        defaultCustomerId?: string; // Stored as string to match Select value, but implies ID
        silentPrinting: boolean;
        printServerUrl: string;
        printerName?: string;
    }

    // POS Settings Form State
    const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
    const [posConfig, setPosConfig] = useState<PosSettings>({
        autoPrint: false,
        terminalId: "POS-01",
        receiptHeader: "",
        receiptFooter: "",
        showLogo: true,
        allowSellOutOfStock: false,
        allowedPaymentMethods: ["CASH", "CARD", "ECOCASH", "usd", "zig"],
        defaultCustomerId: "",
        silentPrinting: false,
        printServerUrl: "http://localhost:12312",
        printerName: ""
    });

    const { data: customers } = useCustomers(companyId);

    useEffect(() => {
        if (currentCompany?.posSettings) {
            const settings = currentCompany.posSettings as any;
            setPosConfig({
                autoPrint: settings.autoPrint ?? false,
                terminalId: settings.terminalId || "POS-01",
                receiptHeader: settings.receiptHeader || "",
                receiptFooter: settings.receiptFooter || "",
                showLogo: settings.showLogo ?? true,
                allowSellOutOfStock: settings.allowSellOutOfStock ?? false,
                allowedPaymentMethods: settings.allowedPaymentMethods || ["CASH", "CARD", "ECOCASH", "usd", "zig"],
                defaultCustomerId: settings.defaultCustomerId || "",
                silentPrinting: settings.silentPrinting ?? false,
                printServerUrl: settings.printServerUrl || "http://localhost:12312",
                printerName: settings.printerName || ""
            });
        }
    }, [currentCompany]);

    // Fetch printers logic
    const fetchPrintersForGlobal = async () => {
        try {
            const response = await fetch(`${posConfig.printServerUrl}/printers`);
            if (response.ok) {
                const data = await response.json();
                setAvailablePrinters(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error("Failed to fetch printers:", error);
        }
    };

    useEffect(() => {
        fetchPrintersForGlobal();
    }, [posConfig.printServerUrl]);

    const handleSavePosSettings = async () => {
        try {
            await updateCompany.mutateAsync({
                posSettings: posConfig
            });
            toast({ title: "Settings Saved", description: "POS configuration updated successfully." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const togglePaymentMethod = (method: string) => {
        setPosConfig((prev: any) => {
            const current = prev.allowedPaymentMethods || [];
            if (current.includes(method)) {
                return { ...prev, allowedPaymentMethods: current.filter((m: string) => m !== method) };
            } else {
                return { ...prev, allowedPaymentMethods: [...current, method] };
            }
        });
    };

    // --- CASHIER MANAGEMENT ---
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [selectedUserForPin, setSelectedUserForPin] = useState<any>(null);
    const [newPin, setNewPin] = useState("");

    const [newUserEmail, setNewUserEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("Cashier123!");

    // Fetch Users
    const { data: users, isLoading: isLoadingUsers } = useQuery({
        queryKey: ["users", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await apiFetch(`/api/companies/${companyId}/users`);
            if (!res.ok) throw new Error("Failed to fetch users");
            return await res.json();
        },
        enabled: !!companyId
    });

    const cashiers = users?.filter((u: any) => u.role === 'cashier' || u.role === 'admin' || u.role === 'owner') || [];

    // Add Cashier Mutation
    const addCashierMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/users`, {
                method: "POST",
                body: JSON.stringify({
                    email: newUserEmail,
                    role: "cashier",
                    name: newName,
                    username: newUserEmail,
                    password: newUserPassword
                })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to add cashier");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users", companyId] });
            toast({ title: "Cashier Added", description: `Added ${newName} successfully.` });
            setIsAddUserOpen(false);
            setNewUserEmail("");
            setNewName("");
            setNewUserPassword("Cashier123!");
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    // Update PIN Mutation
    const updatePinMutation = useMutation({
        mutationFn: async () => {
            if (!selectedUserForPin) return;
            const res = await apiFetch(`/api/companies/${companyId}/users/${selectedUserForPin.id}/pin`, {
                method: "PUT",
                body: JSON.stringify({ pin: newPin })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to update PIN");
            }
        },
        onSuccess: () => {
            toast({ title: "PIN Updated", description: "Cashier PIN has been set." });
            setIsPinModalOpen(false);
            setNewPin("");
            setSelectedUserForPin(null);
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    // Remove User Mutation (if needed for cashiers)
    const removeUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await apiFetch(`/api/companies/${companyId}/users/${userId}`, {
                method: "DELETE"
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to remove user");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users", companyId] });
            toast({ title: "User Removed", description: "The user has been removed from the team." });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });


    // --- MAINTENANCE ---
    const [isClearTestOpen, setIsClearTestOpen] = useState(false);
    const clearTestInvoicesMutation = useMutation({
        mutationFn: async () => {
            const res = await apiFetch(`/api/companies/${companyId}/invoices/clear-test`, {
                method: "POST"
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to clear test invoices");
            }
            return await res.json();
        },
        onSuccess: (data: any) => {
            queryClient.invalidateQueries({ queryKey: ["invoices", companyId] });
            toast({
                title: "Maintenance Complete",
                description: data.message || `Successfully cleared test invoices.`
            });
            setIsClearTestOpen(false);
        },
        onError: (err: Error) => {
            toast({ title: "Maintenance Error", description: err.message, variant: "destructive" });
        }
    });

    if (isLoadingCompany) return <Layout><div className="p-8">Loading...</div></Layout>;

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-3xl font-display font-bold text-slate-900">POS Settings</h1>
                <p className="text-slate-500 mt-1">Configure your Point of Sale terminals and staff access.</p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="bg-slate-100/80 p-1 border border-slate-200 shadow-sm">
                    <TabsTrigger value="general" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Settings className="w-4 h-4 mr-2" />
                        General Config
                    </TabsTrigger>
                    <TabsTrigger value="cashiers" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Users className="w-4 h-4 mr-2" />
                        Cashiers & Access
                    </TabsTrigger>
                    <TabsTrigger value="maintenance" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Wrench className="w-4 h-4 mr-2" />
                        Maintenance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Receipt Settings */}
                        <Card className="card-depth border-none h-fit">
                            <CardHeader>
                                <CardTitle className="flex items-center text-base">
                                    <Printer className="w-5 h-5 mr-2 text-slate-600" />
                                    Receipt Configuration
                                </CardTitle>
                                <CardDescription>Customize how your receipts look.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Receipt Header (Top message)</Label>
                                    <Input
                                        value={posConfig.receiptHeader}
                                        onChange={(e) => setPosConfig({ ...posConfig, receiptHeader: e.target.value })}
                                        placeholder="e.g. Welcome to Our Store"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Receipt Footer (Bottom message)</Label>
                                    <Input
                                        value={posConfig.receiptFooter}
                                        onChange={(e) => setPosConfig({ ...posConfig, receiptFooter: e.target.value })}
                                        placeholder="e.g. Thank you for your business!"
                                    />
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Show Company Logo</Label>
                                        <p className="text-[10px] text-slate-500">Print logo at top of receipt</p>
                                    </div>
                                    <Switch
                                        checked={posConfig.showLogo}
                                        onCheckedChange={(checked) => setPosConfig({ ...posConfig, showLogo: checked })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Behavior Settings */}
                        <Card className="card-depth border-none h-fit">
                            <CardHeader>
                                <CardTitle className="flex items-center text-base">
                                    <Settings className="w-5 h-5 mr-2 text-slate-600" />
                                    Terminal Behavior
                                </CardTitle>
                                <CardDescription>Local settings for this POS instance.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-1">
                                    <Label className="text-xs">Terminal Identifier</Label>
                                    <Input
                                        value={posConfig.terminalId}
                                        onChange={(e) => setPosConfig({ ...posConfig, terminalId: e.target.value })}
                                        placeholder="POS-01"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs">Default Customer</Label>
                                    <Select
                                        value={posConfig.defaultCustomerId?.toString() || "0"}
                                        onValueChange={(val) => setPosConfig({ ...posConfig, defaultCustomerId: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select default customer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">None (Guest/Walk-in)</SelectItem>
                                            {customers?.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-[10px] text-slate-500">Auto-selects this customer for new sales</p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Auto-Print Receipt</Label>
                                        <p className="text-[10px] text-slate-500">Print immediately after sale completion</p>
                                    </div>
                                    <Switch
                                        checked={posConfig.autoPrint}
                                        onCheckedChange={(checked) => setPosConfig({ ...posConfig, autoPrint: checked })}
                                    />
                                </div>

                                <div className="flex items-center justify-between border-t pt-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Silent Printing (Proxy)</Label>
                                        <p className="text-[10px] text-slate-500">Fast printing without browser dialog</p>
                                    </div>
                                    <Switch
                                        checked={posConfig.silentPrinting}
                                        onCheckedChange={(checked) => setPosConfig({ ...posConfig, silentPrinting: checked })}
                                    />
                                </div>

                                {posConfig.silentPrinting && (
                                    <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                                        <Label className="text-xs">Print Server URL</Label>
                                        <Input
                                            value={posConfig.printServerUrl}
                                            onChange={(e) => setPosConfig({ ...posConfig, printServerUrl: e.target.value })}
                                            placeholder="http://localhost:12312"
                                        />
                                        <p className="text-[10px] text-slate-500 italic">Requires middleware running at this address</p>
                                    </div>
                                )}

                                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">Target Printer</label>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-[9px] font-black text-emerald-600 hover:bg-emerald-100"
                                            onClick={fetchPrintersForGlobal}
                                        >
                                            <RefreshCw className="h-3 w-3 mr-1" /> Reload
                                        </Button>
                                    </div>
                                    <Select
                                        value={posConfig.printerName || "default"}
                                        onValueChange={(val) => setPosConfig({ ...posConfig, printerName: val === "default" ? "" : val })}
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

                                <div className="flex items-center justify-between border-t pt-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm">Allow Sell Out of Stock</Label>
                                        <p className="text-[10px] text-slate-500">Process sales even if inventory is zero</p>
                                    </div>
                                    <Switch
                                        checked={posConfig.allowSellOutOfStock}
                                        onCheckedChange={(checked) => setPosConfig({ ...posConfig, allowSellOutOfStock: checked })}
                                    />
                                </div>

                                <div className="space-y-3 border-t pt-4">
                                    <Label className="text-sm">Allowed Payment Methods</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {["CASH", "CARD", "ECOCASH", "usd", "zig"].map((method) => (
                                            <div key={method} className="flex items-center space-x-2">
                                                <Switch
                                                    id={`pay-${method}`}
                                                    checked={posConfig.allowedPaymentMethods?.includes(method)}
                                                    onCheckedChange={() => togglePaymentMethod(method)}
                                                />
                                                <Label htmlFor={`pay-${method}`} className="text-xs cursor-pointer">
                                                    {method === 'usd' ? 'USD Cash' : method === 'zig' ? 'ZiG Cash' : method}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleSavePosSettings}
                                    disabled={updateCompany.isPending}
                                    className="w-full mt-4"
                                >
                                    {updateCompany.isPending ? "Saving..." : "Save Configuration"}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="cashiers" className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Cashier Management</h2>
                            <p className="text-sm text-slate-500">Manage staff who can access the POS.</p>
                        </div>
                        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                            <DialogTrigger asChild>
                                <Button className="flex items-center gap-2">
                                    <UserPlus className="w-4 h-4" />
                                    Add Cashier
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add Cashier</DialogTitle>
                                    <DialogDescription>
                                        Create a new user with cashier privileges.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Full Name</Label>
                                        <Input
                                            placeholder="Jane Doe"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email (Username)</Label>
                                        <Input
                                            placeholder="cashier@store.com"
                                            value={newUserEmail}
                                            onChange={(e) => setNewUserEmail(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Initial Password</Label>
                                        <Input
                                            type="text"
                                            value={newUserPassword}
                                            onChange={(e) => setNewUserPassword(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                                    <Button onClick={() => addCashierMutation.mutate()} disabled={addCashierMutation.isPending}>
                                        {addCashierMutation.isPending ? "Adding..." : "Add Cashier"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card className="card-depth border-none">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>PIN Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cashiers.map((user: any) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{user.name}</span>
                                                    <span className="text-[10px] text-slate-400">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {user.pin ? (
                                                    <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                                        <ShieldCheck className="w-3 h-3" /> Set
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">Not Set</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setSelectedUserForPin(user);
                                                            setIsPinModalOpen(true);
                                                            setNewPin("");
                                                        }}
                                                    >
                                                        <Key className="w-3 h-3 mr-1" />
                                                        Set PIN
                                                    </Button>
                                                    {user.role === 'cashier' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => {
                                                                if (confirm("Remove this cashier?")) {
                                                                    removeUserMutation.mutate(user.id);
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {cashiers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                                No cashiers found. Add one to get started.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="maintenance" className="space-y-6">
                    <Card className="card-depth border-none">
                        <CardHeader>
                            <CardTitle className="flex items-center text-red-600">
                                <AlertTriangle className="w-5 h-5 mr-2" />
                                Database Maintenance
                            </CardTitle>
                            <CardDescription>
                                Advanced tools for managing your company data. Use with caution.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-red-100 bg-red-50/50 rounded-lg gap-4">
                                <div className="space-y-1">
                                    <h4 className="font-semibold text-slate-900">Clear Test Invoices</h4>
                                    <p className="text-sm text-slate-500 max-w-md">
                                        Permanently remove all invoices and related data (items, payments, logs) that were created using ZIMRA's test environment.
                                        This is useful after a testing phase before going live.
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-mono rounded">qr_code_data contains 'fdmstest'</span>
                                    </div>
                                </div>
                                <Dialog open={isClearTestOpen} onOpenChange={setIsClearTestOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="destructive" className="flex items-center gap-2">
                                            <Trash2 className="w-4 h-4" />
                                            Clear Test Data
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center text-red-600">
                                                <AlertTriangle className="w-5 h-5 mr-2" />
                                                Confirm Permanent Deletion
                                            </DialogTitle>
                                            <DialogDescription className="pt-2 text-slate-900 font-medium">
                                                This action is irreversible. All invoices identified as test data will be permanently deleted.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="p-4 bg-red-50 rounded-md border border-red-100 space-y-3">
                                            <p className="text-xs text-red-700 leading-relaxed">
                                                The following related records will also be removed:
                                            </p>
                                            <ul className="text-xs text-red-700 list-disc list-inside space-y-1 ml-2">
                                                <li>Invoice line items</li>
                                                <li>Linked payment records</li>
                                                <li>ZIMRA transaction logs</li>
                                                <li>Fiscal validation errors</li>
                                            </ul>
                                        </div>
                                        <DialogFooter className="mt-4 gap-2">
                                            <Button variant="outline" onClick={() => setIsClearTestOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                onClick={() => clearTestInvoicesMutation.mutate()}
                                                disabled={clearTestInvoicesMutation.isPending}
                                            >
                                                {clearTestInvoicesMutation.isPending ? "Clearing..." : "Yes, Delete Permanently"}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* PIN Dialog */}
            <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set Access PIN</DialogTitle>
                        <DialogDescription>
                            Set a 4-digit numeric PIN for {selectedUserForPin?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>New PIN</Label>
                            <Input
                                type="text"
                                maxLength={4}
                                placeholder="0000"
                                value={newPin}
                                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                                className="text-center text-2xl tracking-widest font-mono"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPinModalOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => updatePinMutation.mutate()}
                            disabled={updatePinMutation.isPending || newPin.length < 4}
                        >
                            {updatePinMutation.isPending ? "Saving..." : "Set PIN"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
