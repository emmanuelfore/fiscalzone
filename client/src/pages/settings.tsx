import { Layout } from "@/components/layout";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useUpdateCompany } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Landmark, 
  Coins, 
  Server, 
  MonitorCheck, 
  Mail, 
  Save, 
  RefreshCw,
  ChevronRight,
  Settings as SettingsIcon,
  LayoutDashboard,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

// Import Sub-components
import { OrganizationProfile } from "@/components/settings/organization-profile";
import { TeamManagement } from "@/components/settings/team-management";
import { SecuritySettings } from "@/components/settings/security-settings";
import { BankingSettings } from "@/components/settings/banking-settings";
import { CurrencySettings } from "@/components/settings/currency-settings";
import { TaxComplianceSettings } from "@/components/settings/tax-compliance-settings";
import { ZimraDeviceSettings } from "@/components/settings/zimra-device-settings";
import { PosTerminalSettings } from "@/components/settings/pos-terminal-settings";
import { CommunicationSettings } from "@/components/settings/communication-settings";
import { MaintenanceSettings } from "@/components/settings/maintenance-settings";
import { RestaurantSettings } from "@/components/settings/restaurant-settings";
import { BranchManagement } from "@/components/settings/branch-management";
import { Coffee, Store } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const { activeCompany, isLoading: isLoadingActive } = useActiveCompany();
  const updateCompany = useUpdateCompany(activeCompany?.id || 0);

  // Deep-linking support via URL query params
  const queryParams = new URLSearchParams(window.location.search);
  const initialTab = queryParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Form State for global fields
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (activeCompany) {
      setFormData({
        name: activeCompany.name || "",
        tradingName: activeCompany.tradingName || "",
        email: activeCompany.email || "",
        phone: activeCompany.phone || "",
        address: activeCompany.address || "",
        city: activeCompany.city || "",
        website: activeCompany.website || "",
        tin: activeCompany.tin || "",
        vatNumber: activeCompany.vatNumber || "",
        bpNumber: activeCompany.bpNumber || "",
        vatEnabled: activeCompany.vatEnabled ?? true,
        vatRegistered: activeCompany.vatRegistered ?? true,
        bankName: activeCompany.bankName || "",
        accountName: activeCompany.accountName || "",
        accountNumber: activeCompany.accountNumber || "",
        branchCode: activeCompany.branchCode || "",
        currency: activeCompany.currency || "USD",
        branchName: activeCompany.branchName || "",
        emailSettings: activeCompany.emailSettings || {
          provider: 'resend',
          apiKey: '',
          fromEmail: '',
          fromName: activeCompany.name || ''
        },
        posSettings: activeCompany.posSettings || {
          terminalId: "",
          receiptHeader: "",
          receiptFooter: "",
          receiptPaperSize: "80mm",
          receiptShowLogo: true,
          requireOverrideForDiscount: false,
          requireOverrideForPriceChange: false,
          requireOverrideForDelete: false,
          requireOverrideForOpenDrawer: false,
          autoPrint: true,
          usePrinterClient: false,
          printingEnabled: true,
          allowSellOutOfStock: false,
          allowedPaymentMethods: ["CASH", "CARD", "ECOCASH", "usd", "zig"],
          defaultCustomerId: "",
          silentPrinting: true,
          printServerUrl: "http://localhost:12312",
          printerName: ""
        },
        restaurantSettings: activeCompany.restaurantSettings || { enabled: false },
        pharmacySettings: activeCompany.pharmacySettings || { enabled: false },
        primaryColor: activeCompany.primaryColor || "#4f46e5",
      });
    }
  }, [activeCompany]);

  // Update URL when tab changes
  useEffect(() => {
    const newUrl = `${window.location.pathname}?tab=${activeTab}`;
    window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
  }, [activeTab]);

  const handleGlobalSave = async () => {
    try {
      await updateCompany.mutateAsync(formData);
      toast({
        title: "Configuration Saved",
        description: "Your organization settings have been updated successfully.",
        className: "bg-slate-900 text-white border-none rounded-2xl"
      });
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  if (isLoadingActive) return <Layout><div className="flex items-center justify-center h-[60vh]"><RefreshCw className="animate-spin w-8 h-8 text-slate-300" /></div></Layout>;
  if (!activeCompany) return <Layout><div className="p-8">No company details available. Please select a company from the sidebar.</div></Layout>;

  const menuGroups = [
    {
      title: "Organization",
      items: [
        { id: "profile", label: "Profile", icon: Building2, desc: "Primary identity & info" },
        { id: "branches", label: "Branches", icon: Store, desc: "Locations & locations" },
        { id: "team", label: "Team", icon: Users, desc: "Managers & staff" },
        { id: "security", label: "Security", icon: ShieldCheck, desc: "API & Access logs" },
      ]
    },
    {
      title: "Financial",
      items: [
        { id: "banking", label: "Banking", icon: Landmark, desc: "Payout destinations" },
        { id: "currencies", label: "Currencies", icon: Coins, desc: "Multi-currency rates" },
      ]
    },
    {
      title: "Fiscal (Tax)",
      items: [
        { id: "zimra", label: "ZIMRA Device", icon: Server, desc: "Fiscalization hardware" },
        { id: "tax", label: "Tax Config", icon: SettingsIcon, desc: "VAT/BP & mapping" },
      ]
    },
    {
      title: "Point of Sale",
      items: [
        { id: "pos", label: "POS Terminal", icon: MonitorCheck, desc: "UI, Receipt & Rules" },
        { id: "restaurant", label: "Restaurant", icon: Coffee, desc: "Floor Plan & Tables" },
      ]
    },
    {
      title: "System",
      items: [
        { id: "communication", label: "Communication", icon: Mail, desc: "Email & notifications" },
        ...(activeCompany?.role === 'owner' ? [{ id: "maintenance", label: "Maintenance", icon: Trash2, desc: "Clear data & reset" }] : [])
      ]
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile': return <OrganizationProfile company={activeCompany} formData={formData} setFormData={setFormData} />;
      case 'branches': return <BranchManagement companyId={activeCompany.id} />;
      case 'team': return <TeamManagement companyId={activeCompany.id} />;
      case 'security': return <SecuritySettings company={activeCompany} />;
      case 'banking': return <BankingSettings formData={formData} setFormData={setFormData} />;
      case 'currencies': return <CurrencySettings companyId={activeCompany.id} />;
      case 'tax': return <TaxComplianceSettings companyId={activeCompany.id} formData={formData} setFormData={setFormData} />;
      case 'zimra': return <ZimraDeviceSettings company={activeCompany} />;
      case 'pos': return <PosTerminalSettings companyId={activeCompany.id} formData={formData} setFormData={setFormData} />;
      case 'restaurant': return <RestaurantSettings company={activeCompany} onUpdate={async (data) => { await updateCompany.mutateAsync(data); }} />;
      case 'communication': return <CommunicationSettings formData={formData} setFormData={setFormData} />;
      case 'maintenance': return <MaintenanceSettings company={activeCompany} />;
      default: return <OrganizationProfile company={activeCompany} formData={formData} setFormData={setFormData} />;
    }
  };

  const showGlobalSave = ['profile', 'banking', 'tax', 'pos', 'communication', 'restaurant', 'maintenance'].includes(activeTab);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight font-display">Administration</h1>
            <p className="text-slate-500 font-medium">Configure your core business infrastructure</p>
          </div>
          {showGlobalSave && (
            <Button 
              onClick={handleGlobalSave} 
              disabled={updateCompany.isPending} 
              className="h-12 px-8 rounded-2xl btn-gradient shadow-xl shadow-indigo-100 font-black gap-2 active:scale-95 transition-all w-full sm:w-auto"
            >
              {updateCompany.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Changes
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
          {/* Admin Sidebar */}
          <aside className="space-y-8 bg-white/50 backdrop-blur-md p-4 rounded-[2.5rem] border border-white shadow-sm h-fit sticky top-24">
            {menuGroups.map((group, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.title}</h3>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full group flex items-start gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative ${
                        activeTab === item.id 
                          ? "bg-slate-900 text-white shadow-2xl shadow-slate-300 translate-x-1" 
                          : "text-slate-500 hover:bg-white hover:shadow-lg hover:shadow-slate-100 hover:text-slate-900 hover:translate-x-1"
                      }`}
                    >
                      <div className={`p-2 rounded-xl transition-colors ${
                        activeTab === item.id ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200/50 group-hover:text-slate-600"
                      }`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="text-left overflow-hidden">
                        <p className={`text-sm font-bold leading-tight ${activeTab === item.id ? "text-white" : "text-slate-700"}`}>{item.label}</p>
                        <p className={`text-[10px] truncate max-w-[160px] ${activeTab === item.id ? "text-slate-400" : "text-slate-400"}`}>{item.desc}</p>
                      </div>
                      {activeTab === item.id && (
                        <motion.div layoutId="active-indicator" className="ml-auto flex items-center h-full">
                           <ChevronRight className="w-4 h-4 text-white/40" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t border-slate-100">
               <Button 
                variant="ghost" 
                className="w-full justify-start px-4 h-11 rounded-2xl text-slate-400 hover:text-slate-900 font-bold text-xs gap-3"
                onClick={() => setLocation("/dashboard")}
              >
                <LayoutDashboard className="w-4 h-4" />
                Return to Dashboard
              </Button>
            </div>
          </aside>

          {/* Setting Section Container */}
          <div className="relative min-h-[600px] mb-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="w-full"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}

