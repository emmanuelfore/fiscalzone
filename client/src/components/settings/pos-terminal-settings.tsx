import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { 
  MonitorCheck, 
  Settings, 
  Printer, 
  FileText, 
  ShieldCheck, 
  HelpCircle,
  Download,
  AlertTriangle,
  Loader2,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Users,
  Key,
  UserPlus,
  Wrench,
  RefreshCw,
  Save,
  Monitor
} from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useCustomers } from "@/hooks/use-customers";

interface PosTerminalSettingsProps {
  formData: any;
  setFormData: (data: any) => void;
  isLoading?: boolean;
  companyId: number;
}

export function PosTerminalSettings({ formData, setFormData, isLoading, companyId }: PosTerminalSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("terminal");
  const [printerClientStatus, setPrinterClientStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);

  // Check Printer Client Connectivity
  useEffect(() => {
    const checkPrinter = async () => {
      try {
        const res = await fetch('http://localhost:3001/ping');
        if (res.ok) setPrinterClientStatus('online');
        else setPrinterClientStatus('offline');
      } catch (e) {
        setPrinterClientStatus('offline');
      }
    };
    checkPrinter();
  }, []);

  const sections = [
    { id: "terminal", label: "Identity", icon: MonitorCheck },
    { id: "receipt", label: "Receipt Design", icon: FileText },
    { id: "printing", label: "Hardware & Printing", icon: Printer },
    { id: "sales", label: "Sales & Rules", icon: ShieldCheck },
    { id: "barcodes", label: "Barcode Rules", icon: Wrench },
    { id: "cashiers", label: "Cashiers", icon: Users },
    { id: "downloads", label: "Apps & Client", icon: Download },
    { id: "maintenance", label: "Maintenance", icon: Wrench },
  ];

  const posSettings = formData.posSettings || {
    terminalId: "",
    receiptHeader: "",
    receiptFooter: "",
    receiptPaperSize: "80mm",
    receiptShowLogo: true,
    requireOverrideForDiscount: false,
    requireOverrideForPriceChange: false,
    requireOverrideForDelete: false,
    requireOverrideForOpenDrawer: false,
    usePrinterClient: false,
    printingEnabled: true,
    autoPrint: true,
    allowSellOutOfStock: false,
    allowedPaymentMethods: ["CASH", "CARD", "ECOCASH", "usd", "zig"],
    defaultCustomerId: "",
    silentPrinting: true,
    printServerUrl: "http://localhost:12312",
    printerName: "",
    quantityDecimalPlaces: 2,
    variableWeightBarcodeRules: [
      {
        id: "rule-1",
        name: "Scale Items (Prefix 20)",
        enabled: true,
        prefix: "20",
        totalLength: 13,
        skuStart: 2,
        skuLength: 4,
        quantityStart: 6,
        quantityLength: 6,
        quantityDivisor: 1000,
      }
    ],
  };

  const updatePosSetting = (key: string, value: any) => {
    setFormData({
      ...formData,
      posSettings: {
        ...posSettings,
        [key]: value
      }
    });
  };

  const togglePaymentMethod = (method: string) => {
    const current = posSettings.allowedPaymentMethods || [];
    const newValue = current.includes(method)
      ? current.filter((m: string) => m !== method)
      : [...current, method];
    updatePosSetting('allowedPaymentMethods', newValue);
  };

  const { data: customers } = useCustomers(companyId);

  // --- CASHIER MANAGEMENT ---
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedUserForPin, setSelectedUserForPin] = useState<any>(null);
  const [newPin, setNewPin] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("Cashier123!");

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
      if (!res.ok) throw new Error("Failed to add cashier");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", companyId] });
      toast({ title: "Cashier Added", description: `Added ${newName} successfully.` });
      setIsAddUserOpen(false);
      setNewUserEmail("");
      setNewName("");
    }
  });

  const updatePinMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserForPin) return;
      const res = await apiFetch(`/api/companies/${companyId}/users/${selectedUserForPin.id}/pin`, {
        method: "PUT",
        body: JSON.stringify({ pin: newPin })
      });
      if (!res.ok) throw new Error("Failed to update PIN");
    },
    onSuccess: () => {
      toast({ title: "PIN Updated", description: "Cashier PIN has been set." });
      setIsPinModalOpen(false);
      setNewPin("");
    }
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiFetch(`/api/companies/${companyId}/users/${userId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to remove user");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", companyId] });
      toast({ title: "User Removed", description: "The user has been removed." });
    }
  });

  // --- MAINTENANCE ---
  const [isClearTestOpen, setIsClearTestOpen] = useState(false);
  const clearTestInvoicesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${companyId}/invoices/clear-test`, {
        method: "POST"
      });
      if (!res.ok) throw new Error("Failed to clear test invoices");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices", companyId] });
      toast({ title: "Maintenance Complete", description: "Successfully cleared test invoices." });
      setIsClearTestOpen(false);
    }
  });

  const fetchPrintersForGlobal = async () => {
    try {
      if (window.electronAPI) {
        const printers = await window.electronAPI.getPrinters();
        setAvailablePrinters(Array.isArray(printers) ? printers : []);
      } else {
        const response = await fetch(`${posSettings.printServerUrl}/printers`);
        if (response.ok) {
          const data = await response.json();
          setAvailablePrinters(Array.isArray(data) ? data : []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch printers:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Internal Sub-navigation */}
      <aside className="space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-3">POS Configuration</p>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeSection === s.id 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <s.icon className={`w-4 h-4 ${activeSection === s.id ? "text-white" : "text-slate-400"}`} />
            {s.label}
          </button>
        ))}
      </aside>

      {/* Content Area */}
      <div className="space-y-6 min-h-[500px]">
        {activeSection === 'terminal' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <MonitorCheck className="w-5 h-5 text-indigo-600" />
              Terminal Identity
            </h3>
            <Card className="card-depth border-none">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Terminal Unique ID</Label>
                  <Input 
                    value={posSettings.terminalId || ""} 
                    onChange={e => updatePosSetting('terminalId', e.target.value)} 
                    placeholder="e.g. T-001, FRONT-DESK-1"
                  />
                  <p className="text-[11px] text-slate-400 italic">This ID helps track which physical device issued a specific receipt.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'receipt' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              Receipt Design
            </h3>
            <Card className="card-depth border-none">
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Paper Size</Label>
                    <div className="flex gap-2">
                      {['80mm', '58mm', 'A4'].map(size => (
                        <button
                          key={size}
                          onClick={() => updatePosSetting('receiptPaperSize', size)}
                          className={`flex-1 h-10 rounded-lg text-xs font-bold border transition-all ${
                            posSettings.receiptPaperSize === size 
                              ? "bg-slate-900 text-white border-slate-900" 
                              : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Checkbox 
                      id="showLogo" 
                      checked={posSettings.receiptShowLogo} 
                      onCheckedChange={checked => updatePosSetting('receiptShowLogo', checked)} 
                    />
                    <Label htmlFor="showLogo" className="text-sm font-bold text-slate-700">Display Logo on Receipt</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Receipt Header Text</Label>
                  <Input 
                    value={posSettings.receiptHeader || ""} 
                    onChange={e => updatePosSetting('receiptHeader', e.target.value)} 
                    placeholder="e.g. Welcome to our store!"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Receipt Footer / Terms</Label>
                  <textarea 
                    className="w-full min-h-[100px] rounded-xl border border-slate-200 p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={posSettings.receiptFooter || ""} 
                    onChange={e => updatePosSetting('receiptFooter', e.target.value)} 
                    placeholder="e.g. Terms: No refund after 7 days. Thank you!"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'printing' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
             <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Printer className="w-5 h-5 text-blue-600" />
                Hardware & Printing
              </h3>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${printerClientStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black uppercase text-slate-500">Client: {printerClientStatus}</span>
              </div>
            </div>

            <Card className="card-depth border-none bg-indigo-50/30 border-indigo-100/50">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100 mb-4">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-blue-900">Printing Enabled</Label>
                    <p className="text-xs text-blue-600/70">Master toggle — disables all receipt printing when off.</p>
                  </div>
                  <Switch 
                    checked={posSettings.printingEnabled ?? true} 
                    onCheckedChange={checked => updatePosSetting('printingEnabled', checked)} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-slate-900">Auto Print</Label>
                    <p className="text-xs text-slate-500">Print immediately after sale completion.</p>
                  </div>
                  <Switch 
                    checked={posSettings.autoPrint} 
                    onCheckedChange={checked => updatePosSetting('autoPrint', checked)} 
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold text-indigo-900">Use Local Printer Client</Label>
                    <p className="text-xs text-indigo-600/70">Connect to physical thermal printers via Desktop App.</p>
                  </div>
                  <Checkbox 
                    checked={posSettings.usePrinterClient} 
                    onCheckedChange={checked => updatePosSetting('usePrinterClient', checked)} 
                  />
                </div>
                
                {posSettings.usePrinterClient && (
                  <div className="bg-white/80 rounded-2xl p-4 border border-indigo-100 mt-2 space-y-3">
                    <div className="flex items-center justify-between group">
                       <Label className="text-xs font-bold text-slate-700">Silent Printing (Proxy)</Label>
                       <Switch checked={posSettings.silentPrinting} onCheckedChange={(v) => updatePosSetting('silentPrinting', v)} />
                    </div>

                    {posSettings.silentPrinting && (
                      <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                         <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase">Print Server URL</Label>
                            <Input value={posSettings.printServerUrl} onChange={(e) => updatePosSetting('printServerUrl', e.target.value)} className="h-9 text-xs" />
                         </div>
                         <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                               <Label className="text-[10px] font-bold text-slate-500 uppercase font-display">Target Printer</Label>
                               <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-indigo-50 text-indigo-600" onClick={fetchPrintersForGlobal}>
                                  <RefreshCw className="w-3 h-3 mr-1" /> Reload
                               </Button>
                            </div>
                            <Select value={posSettings.printerName || "default"} onValueChange={(val) => updatePosSetting('printerName', val === "default" ? "" : val)}>
                               <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                               <SelectContent>
                                  <SelectItem value="default">System Default</SelectItem>
                                  {availablePrinters.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                               </SelectContent>
                            </Select>
                         </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                       <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-2" onClick={() => window.open('/downloads/printer-client.zip')}>
                        <Download className="w-3.5 h-3.5" /> Download Client
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-8 text-xs font-bold gap-2">
                            <HelpCircle className="w-3.5 h-3.5" /> Setup Guide
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl rounded-[2rem]">
                          <DialogHeader>
                            <DialogTitle className="text-2xl font-black font-display">Thermal Printer Setup</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                             <div className="space-y-3">
                              <h4 className="font-bold text-slate-900 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                                Download & Install
                              </h4>
                              <p className="text-sm text-slate-600 pl-8">Download <code>printer-client.zip</code>, extract it, and run <code>printer-client.exe</code>.</p>
                            </div>
                            <div className="space-y-3">
                              <h4 className="font-bold text-slate-900 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                                Set as Silent Printer
                              </h4>
                              <p className="text-sm text-slate-600 pl-8">In the client, select your thermal printer (e.g., POS-80) and click <strong>"Set as Default"</strong>.</p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'sales' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-violet-600" />
              Sales & Business Rules
            </h3>
            
            <Card className="card-depth border-none">
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                   <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Default POS Customer</Label>
                   <Select value={posSettings.defaultCustomerId?.toString() || "0"} onValueChange={v => updatePosSetting('defaultCustomerId', v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select default customer" /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="0">None (Walk-in)</SelectItem>
                         {customers?.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                      </SelectContent>
                   </Select>
                   <p className="text-[11px] text-slate-400">Automatically selected when starting a new sale.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                   <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-700">Allow Out-of-Stock Sales</Label>
                      <p className="text-xs text-slate-500">Allow adding items with 0 or negative stock level to cart.</p>
                   </div>
                   <Switch checked={posSettings.allowSellOutOfStock} onCheckedChange={v => updatePosSetting('allowSellOutOfStock', v)} />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                   <div className="space-y-0.5">
                      <Label className="text-sm font-bold text-slate-700">Quantity Decimal Places</Label>
                      <p className="text-xs text-slate-500">Number of decimal places allowed for item quantities (e.g. 2 for meat/weight).</p>
                   </div>
                   <div className="w-24">
                      <Input 
                        type="number" 
                        min={0} 
                        max={4} 
                        value={posSettings.quantityDecimalPlaces ?? 2} 
                        onChange={e => updatePosSetting('quantityDecimalPlaces', parseInt(e.target.value) || 0)}
                        className="text-right font-bold"
                      />
                   </div>
                </div>

                <div className="space-y-3">
                   <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Accepted Payment Methods</Label>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: "CASH", label: "ZWL Cash" },
                        { id: "CARD", label: "Card" },
                        { id: "ECOCASH", label: "EcoCash" },
                        { id: "usd", label: "USD Cash" },
                        { id: "zig", label: "ZiG Cash" }
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => togglePaymentMethod(method.id)}
                          className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                            posSettings.allowedPaymentMethods?.includes(method.id)
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          {posSettings.allowedPaymentMethods?.includes(method.id) ? <CheckCircle2 className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-slate-300" />}
                          <span className="text-[11px] font-bold">{method.label}</span>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Admin PIN Overrides</p>
                  {[
                    { id: 'Discount', label: 'Manual Discount', desc: 'Require admin PIN when applying a manual discount.' },
                    { id: 'PriceChange', label: 'Price Change', desc: 'Require admin PIN when manually changing price.' },
                    { id: 'Delete', label: 'Delete Item / Void', desc: 'Require admin PIN to remove items or void.' },
                    { id: 'OpenDrawer', label: 'Open Cash Drawer', desc: 'Require admin PIN to open drawer.' },
                  ].map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-bold text-slate-700">{rule.label}</Label>
                        <p className="text-xs text-slate-500">{rule.desc}</p>
                      </div>
                      <Checkbox 
                        checked={posSettings[`requireOverrideFor${rule.id}`]} 
                        onCheckedChange={checked => updatePosSetting(`requireOverrideFor${rule.id}`, checked)} 
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'barcodes' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-violet-600" />
                Variable Weight Barcode Rules
              </h3>
              <Button
                size="sm"
                className="btn-gradient rounded-xl font-bold"
                onClick={() => {
                  const rules = posSettings.variableWeightBarcodeRules || [];
                  updatePosSetting('variableWeightBarcodeRules', [
                    ...rules,
                    {
                      id: `rule-${Date.now()}`,
                      name: 'New Rule',
                      enabled: true,
                      prefix: '20',
                      totalLength: 13,
                      skuStart: 2,
                      skuLength: 4,
                      quantityStart: 6,
                      quantityLength: 6,
                      quantityDivisor: 1000,
                    }
                  ]);
                }}
              >
                + Add Rule
              </Button>
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Define how to parse barcodes from weighing scales. When a barcode matches a rule's prefix and length, the system extracts the product SKU and quantity automatically without any manual input.
            </p>

            {(posSettings.variableWeightBarcodeRules || []).length === 0 && (
              <div className="p-10 text-center text-slate-400 font-medium border-2 border-dashed border-slate-100 rounded-2xl">
                No barcode rules configured. Add one to get started.
              </div>
            )}

            {(posSettings.variableWeightBarcodeRules || []).map((rule: any, idx: number) => {
              const updateRule = (key: string, value: any) => {
                const rules = [...(posSettings.variableWeightBarcodeRules || [])];
                rules[idx] = { ...rules[idx], [key]: value };
                updatePosSetting('variableWeightBarcodeRules', rules);
              };
              const deleteRule = () => {
                const rules = (posSettings.variableWeightBarcodeRules || []).filter((_: any, i: number) => i !== idx);
                updatePosSetting('variableWeightBarcodeRules', rules);
              };

              // Live barcode preview
              const previewBarcode = `${rule.prefix || ''}${'0'.repeat(Math.max(0, (rule.skuLength || 0)))}-${'0'.repeat(Math.max(0, (rule.quantityLength || 0)))}X`;
              const previewLen = (Number(rule.prefix?.length || 0) + Number(rule.skuLength || 0) + Number(rule.quantityLength || 0) + 1);

              return (
                <Card key={rule.id} className={`card-depth border-none transition-all ${rule.enabled ? 'ring-1 ring-violet-200' : 'opacity-60'}`}>
                  <CardContent className="pt-5 space-y-4">
                    {/* Header row */}
                    <div className="flex items-center gap-3">
                      <Switch checked={rule.enabled} onCheckedChange={v => updateRule('enabled', v)} />
                      <Input
                        value={rule.name}
                        onChange={e => updateRule('name', e.target.value)}
                        className="h-8 text-sm font-bold border-none bg-slate-50 rounded-xl flex-1"
                        placeholder="Rule Name"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                        onClick={deleteRule}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Rule fields grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Prefix</Label>
                        <Input value={rule.prefix} onChange={e => updateRule('prefix', e.target.value)} className="h-9 text-sm font-mono font-bold" placeholder="20" />
                        <p className="text-[9px] text-slate-400">Identifies this barcode type</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Total Length</Label>
                        <Input type="number" value={rule.totalLength} onChange={e => updateRule('totalLength', parseInt(e.target.value) || 0)} className="h-9 text-sm font-bold" />
                        <p className="text-[9px] text-slate-400">Total barcode digits</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Qty Divisor</Label>
                        <Input type="number" value={rule.quantityDivisor} onChange={e => updateRule('quantityDivisor', parseInt(e.target.value) || 1)} className="h-9 text-sm font-bold" />
                        <p className="text-[9px] text-slate-400">e.g. 1000 → grams to kg</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">SKU Start</Label>
                        <Input type="number" value={rule.skuStart} onChange={e => updateRule('skuStart', parseInt(e.target.value) || 0)} className="h-9 text-sm font-bold" />
                        <p className="text-[9px] text-slate-400">Character index (0-based)</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">SKU Length</Label>
                        <Input type="number" value={rule.skuLength} onChange={e => updateRule('skuLength', parseInt(e.target.value) || 0)} className="h-9 text-sm font-bold" />
                        <p className="text-[9px] text-slate-400">Number of digits for SKU</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Qty Start</Label>
                        <Input type="number" value={rule.quantityStart} onChange={e => updateRule('quantityStart', parseInt(e.target.value) || 0)} className="h-9 text-sm font-bold" />
                        <p className="text-[9px] text-slate-400">Character index (0-based)</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase text-slate-400">Qty Length</Label>
                        <Input type="number" value={rule.quantityLength} onChange={e => updateRule('quantityLength', parseInt(e.target.value) || 0)} className="h-9 text-sm font-bold" />
                        <p className="text-[9px] text-slate-400">Number of digits for quantity</p>
                      </div>
                    </div>

                    {/* Live preview + interactive test */}
                    <div className="bg-violet-50/50 rounded-xl p-3 border border-violet-100 space-y-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">Barcode Structure</p>
                      <div className="flex items-center gap-1 flex-wrap font-mono text-xs">
                        <span className="px-1.5 py-0.5 bg-violet-200 text-violet-800 rounded font-black">{rule.prefix || '??'}</span>
                        <span className="text-slate-300 text-[10px]">prefix</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-black">{'X'.repeat(rule.skuLength || 0)}</span>
                        <span className="text-slate-300 text-[10px]">sku</span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-black">{'Y'.repeat(rule.quantityLength || 0)}</span>
                        <span className="text-slate-300 text-[10px]">qty</span>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-black">Z</span>
                        <span className="text-slate-300 text-[10px]">check</span>
                        <span className="ml-auto text-[10px] text-slate-400 font-sans">{previewLen} digits total</span>
                      </div>

                      {/* Decoder Test */}
                      <div className="pt-1 border-t border-violet-100 space-y-1.5">
                        <p className="text-[9px] font-black uppercase tracking-widest text-violet-400">Test a Barcode</p>
                        <Input
                          placeholder={`e.g. ${rule.prefix || '20'}${'1234'.slice(0, rule.skuLength || 4)}${'001382'.slice(0, rule.quantityLength || 6)}4`}
                          className="h-8 text-xs font-mono bg-white border-violet-200 rounded-lg"
                          onChange={e => {
                            const testBarcode = e.target.value.trim();
                            const resultEl = document.getElementById(`barcode-test-result-${rule.id}`);
                            if (!resultEl) return;
                            if (!testBarcode) { resultEl.innerHTML = ''; return; }

                            const matchesPrefix = testBarcode.startsWith(rule.prefix || '');
                            const matchesLen = testBarcode.length === (rule.totalLength || 0);
                            if (!matchesPrefix || !matchesLen) {
                              resultEl.innerHTML = `<span style="color:#ef4444">✗ No match — prefix: ${matchesPrefix ? '✓' : '✗'}, length ${testBarcode.length} vs ${rule.totalLength}: ${matchesLen ? '✓' : '✗'}</span>`;
                              return;
                            }
                            const sku = testBarcode.substring(rule.skuStart || 0, (rule.skuStart || 0) + (rule.skuLength || 0));
                            const qtyRaw = parseInt(testBarcode.substring(rule.quantityStart || 0, (rule.quantityStart || 0) + (rule.quantityLength || 0)));
                            const qty = qtyRaw / (rule.quantityDivisor || 1000);
                            resultEl.innerHTML = `<span style="color:#16a34a">✓ </span><b>SKU: <code style="background:#f0fdf4;padding:1px 4px;border-radius:4px">${sku}</code></b>&nbsp;&nbsp;<b>Qty: <code style="background:#eff6ff;padding:1px 4px;border-radius:4px">${qty.toFixed(3)}</code></b> — your product must have SKU <strong>${sku}</strong>`;
                          }}
                        />
                        <p id={`barcode-test-result-${rule.id}`} className="text-[10px] font-medium leading-relaxed" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeSection === 'cashiers' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="flex justify-between items-center">
               <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Cashiers & Staff Access
              </h3>
              <Button size="sm" className="btn-gradient rounded-xl font-bold" onClick={() => setIsAddUserOpen(true)}>
                 <UserPlus className="w-4 h-4 mr-2" /> Add Cashier
              </Button>
            </div>

            <Card className="card-depth border-none">
              <CardContent className="p-0">
                 {isLoadingUsers ? (
                   <div className="p-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading users...</div>
                 ) : (
                   <div className="divide-y divide-slate-100">
                      {cashiers.map((user: any) => (
                        <div key={user.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-sm">
                                 {user.name && user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                 <p className="text-sm font-bold text-slate-900">{user.name}</p>
                                 <p className="text-xs text-slate-500">{user.email} • <span className="uppercase font-bold text-[10px]">{user.role}</span></p>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold" 
                                 onClick={() => { setSelectedUserForPin(user); setIsPinModalOpen(true); setNewPin(""); }}>
                                 <Key className="w-3.5 h-3.5 mr-1.5" /> {user.pin ? "Update PIN" : "Set PIN"}
                              </Button>
                              {user.role === 'cashier' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                   onClick={() => { if(confirm("Remove user?")) removeUserMutation.mutate(user.id); }}>
                                   <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                           </div>
                        </div>
                      ))}
                      {cashiers.length === 0 && <div className="p-10 text-center text-slate-400 font-medium">No cashiers found.</div>}
                   </div>
                 )}
              </CardContent>
            </Card>

            {/* Add Cashier Dialog */}
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogContent className="rounded-[2rem]">
                <DialogHeader><DialogTitle>Add New Cashier</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                   <div className="space-y-1.5"><Label className="text-xs font-bold text-slate-600">Full Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} /></div>
                   <div className="space-y-1.5"><Label className="text-xs font-bold text-slate-600">Email / Username</Label><Input value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} /></div>
                   <div className="space-y-1.5"><Label className="text-xs font-bold text-slate-600">Initial Password</Label><Input type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} /></div>
                </div>
                <DialogFooter>
                   <Button variant="ghost" onClick={() => setIsAddUserOpen(false)}>Cancel</Button>
                   <Button className="btn-gradient" onClick={() => addCashierMutation.mutate()} disabled={addCashierMutation.isPending}>Create Account</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* PIN Dialog */}
            <Dialog open={isPinModalOpen} onOpenChange={setIsPinModalOpen}>
              <DialogContent className="max-w-xs rounded-[2rem]">
                <DialogHeader><DialogTitle className="text-center">Set PIN for {selectedUserForPin?.name}</DialogTitle></DialogHeader>
                <div className="py-6">
                   <Input 
                      type="text" maxLength={4} placeholder="• • • •" 
                      className="text-center text-3xl tracking-[0.6em] font-mono h-14 rounded-xl"
                      value={newPin} onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                   />
                </div>
                <DialogFooter>
                   <Button className="w-full btn-gradient" onClick={() => updatePinMutation.mutate()} disabled={updatePinMutation.isPending}>Save PIN Code</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {activeSection === 'downloads' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-600" />
              Apps & Drivers
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="card-depth border-none bg-slate-900 text-white overflow-hidden group">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-white/10 rounded-2xl">
                      <Monitor className="w-6 h-6 text-white" />
                    </div>
                    <div className="px-3 py-1 bg-indigo-500 rounded-full text-[10px] font-black uppercase tracking-wider">Desktop</div>
                  </div>
                  <div>
                    <h4 className="text-xl font-black">Desktop POS App</h4>
                    <p className="text-slate-400 text-xs">Run your POS faster with the native desktop application.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl gap-2 h-11"
                      onClick={() => window.open('https://github.com/FiscalStack/fisczim/releases/latest')}
                    >
                      <ExternalLink className="w-4 h-4" /> Windows Installer (.exe)
                    </Button>
                    <Button 
                      variant="ghost"
                      className="w-full text-slate-400 hover:text-white hover:bg-white/10 font-bold rounded-xl gap-2 h-10 text-xs"
                      onClick={() => window.open('https://github.com/FiscalStack/fisczim/releases/latest')}
                    >
                      <Download className="w-3.5 h-3.5" /> Linux AppImage
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center">Available from GitHub Releases</p>
                </CardContent>
              </Card>

              <Card className="card-depth border-none border border-slate-100 group">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-slate-100 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                      <Printer className="w-6 h-6 text-slate-600 group-hover:text-indigo-600" />
                    </div>
                    <div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-wider text-slate-500">Service</div>
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-slate-900">Printer Client</h4>
                    <p className="text-slate-500 text-xs text-pretty">Lightweight service for silent thermal printing & cash drawers.</p>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full border-slate-200 hover:border-slate-900 font-bold rounded-xl gap-2 h-11"
                    onClick={() => window.open('/downloads/printer-client.zip')}
                  >
                    <Download className="w-4 h-4" /> Download Zip (v1.0)
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeSection === 'maintenance' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-red-600" />
              Maintenance & Cleanup
            </h3>
            
            <Card className="border-red-100 bg-red-50/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-start gap-6">
                   <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">Clear Test Fiscal Data</p>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-md">Permanently removes all invoices and logs created in ZIMRA test mode. Recommended before going live.</p>
                   </div>
                   <Button variant="destructive" size="sm" className="font-bold rounded-xl" onClick={() => setIsClearTestOpen(true)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Clear Test Data
                   </Button>
                </div>
              </CardContent>
            </Card>

            <Dialog open={isClearTestOpen} onOpenChange={setIsClearTestOpen}>
              <DialogContent className="rounded-[2rem]">
                <DialogHeader>
                   <DialogTitle className="text-red-600">Delete Test Invoices?</DialogTitle>
                   <DialogDescription>This operation is irreversible. All test invoices, payments, and logs will be deleted.</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                   <Button variant="outline" onClick={() => setIsClearTestOpen(false)}>Cancel</Button>
                   <Button variant="destructive" onClick={() => clearTestInvoicesMutation.mutate()} disabled={clearTestInvoicesMutation.isPending}>Confirm Deletion</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}
