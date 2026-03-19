import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCompanies } from "@/hooks/use-companies";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
  Package,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Plus,
  Calculator,
  Briefcase,
  Coins,
  Server,
  UserCog,
  BarChart3,
  Activity,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  MonitorCheck,
  TrendingUp,
  ShieldCheck,
  History,
  Receipt,
  Truck,
  Menu,
  X
} from "lucide-react";
import { useBranding } from "@/hooks/use-branding";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { CreateCompanyDialog } from "./create-company-dialog";
import { cn } from "@/lib/utils";
import { DeviceStatusWidget } from "./device-status-widget";

type NavItem = {
  icon: any;
  label: string;
  href?: string;
  children?: {
    icon: any;
    label: string;
    href: string;
    children?: {
      icon: any;
      label: string;
      href: string;
    }[];
  }[];
};

import { useActiveCompany } from "@/hooks/use-active-company";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { data: companies } = useCompanies(!!user);
  const { activeCompany, activeCompanyId, setCompany } = useActiveCompany(!!user);
  const { brand, currentBrand } = useBranding();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on location change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleCompanyChange = (id: number) => {
    setCompany(id);
  };

  const selectedCompanyId = activeCompanyId;
  const selectedCompany = activeCompany;

  const activeRole = (activeCompany as any)?.role;

  const allNavItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    {
      icon: MonitorCheck,
      label: "POS Terminal",
      children: [
        { icon: MonitorCheck, label: "View POS", href: "/pos" },
        { icon: History, label: "My Sales History", href: "/pos/my-sales" }
      ]
    },
    {
      icon: Briefcase,
      label: "Sales & Billing",
      children: [
        { icon: FileText, label: "Invoices", href: "/invoices" },
        { icon: ClipboardList, label: "Quotations", href: "/quotations" },
        { icon: RefreshCw, label: "Recurring Invoices", href: "/recurring" },
        { icon: Users, label: "Customers", href: "/customers" },
        { icon: FileText, label: "Customer Statements", href: "/reports?tab=statements" },
      ]
    },
    {
      icon: Package,
      label: "Inventory",
      children: [
        { icon: LayoutDashboard, label: "Goods Received", href: "/inventory/account" },
        { icon: Package, label: "Products", href: "/products" },
        { icon: History, label: "Stock Ledger", href: "/inventory" },
        { icon: Briefcase, label: "Services", href: "/services" },
        { icon: Truck, label: "Suppliers", href: "/suppliers" },
      ]
    },
    {
      icon: Building2,
      label: "Intelligence Hub",
      children: [
        { icon: BarChart3, label: "Analytics Dashboard", href: "/reports?tab=analytics" },
        { icon: Receipt, label: "Daily Sales Ledger", href: "/reports/daily" },
        { icon: TrendingUp, label: "Profit & Loss", href: "/reports/financial" },
        { icon: Calculator, label: "Expenses", href: "/expenses" },
        { icon: Package, label: "Stock Reports", href: "/reports/inventory" },
        { icon: FileText, label: "Tax & ZIMRA", href: "/reports/tax" },
        { icon: Coins, label: "Currencies", href: "/currencies" },
      ]
    },
    {
      icon: Server,
      label: "Compliance",
      children: [
        { icon: Server, label: "ZIMRA Device", href: "/zimra-settings" },
        { icon: ClipboardList, label: "Transaction Logs", href: "/zimra-logs" },
        { icon: Activity, label: "FDMS Test", href: "/fdms-test" },
        { icon: CreditCard, label: "Subscription", href: "/subscription" },
      ]
    },
    {
      icon: Settings,
      label: "Administration",
      children: [
        { icon: UserCog, label: "Team", href: "/team-settings" },
        { icon: Settings, label: "Settings", href: "/settings" },
        { icon: MonitorCheck, label: "POS Settings", href: "/pos-settings" },
      ]
    }
  ];

  const isCashier = !user?.isSuperAdmin && activeRole === 'cashier';

  const navItems = isCashier
    ? [
      {
        icon: MonitorCheck,
        label: "POS Terminal",
        href: "/pos"
      },
      {
        icon: Receipt,
        label: "My Sales History",
        href: "/pos/my-sales"
      }
    ]
    : allNavItems;

  if (!user) return null;

  return (
    <>
      {/* Brand Specific Fonts & Styles */}
      {currentBrand === "fiscalzone" && (
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&display=swap');
          .fz-admin { font-family: 'Syne', sans-serif !important; }
          .fz-admin .font-display { font-family: 'Bricolage Grotesque', sans-serif !important; }
          .fz-sidebar { background: rgba(15, 23, 42, 0.9) !important; color: white !important; border-color: rgba(255,255,255,0.1) !important; }
          .fz-sidebar .text-slate-800 { color: white !important; }
          .fz-sidebar .text-slate-500 { color: rgba(255,255,255,0.6) !important; }
          .fz-sidebar .bg-white { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.1) !important; }
        `}</style>
      )}

      <div className={cn(
        "min-h-screen bg-slate-50/50 flex transition-all duration-300",
        currentBrand === "fiscalzone" ? "fz-admin" : "font-sans selection:bg-violet-500/20"
      )}>

      {/* Floating Sidebar */}
      <aside className={cn(
        "w-72 bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl shadow-slate-200/50 flex flex-col fixed inset-y-4 left-4 z-50 rounded-[2rem] overflow-hidden transition-all duration-300",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)] lg:translate-x-0",
        currentBrand === "fiscalzone" && "fz-sidebar"
      )}>
        <div className="p-6 border-b border-slate-100/50 bg-white/50">
          <div className="flex items-center gap-3 mb-6 px-1">
            {currentBrand === "fiscalzone" ? (
              <span className="text-xl font-black text-slate-800 tracking-tight font-display">
                Fiscal<span className="text-blue-600">Zone</span>
              </span>
            ) : (
              <img src={brand.logo} alt={brand.name} className="h-9" />
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="p-3 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md hover:border-violet-200/60 transition-all cursor-pointer group active:scale-95 duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 flex items-center justify-center text-slate-400 overflow-hidden shadow-inner font-display font-bold text-xs">
                    {selectedCompany?.logoUrl ? (
                      <img src={selectedCompany.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="overflow-hidden flex-1 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Entity</p>
                      {user.isSuperAdmin && (
                        <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0 rounded-full font-black uppercase tracking-wider border border-amber-100">Super</span>
                      )}
                    </div>
                    <p className="text-sm font-black text-slate-800 truncate flex items-center gap-1 group-hover:text-violet-700 transition-colors font-display">
                      {selectedCompany ? selectedCompany.name : "Setup Required"}
                    </p>
                    {selectedCompany && (
                      <span className={`text-[9px] px-1.5 rounded-md font-bold uppercase tracking-wider ${selectedCompany.zimraEnvironment === 'production' ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                        {selectedCompany.zimraEnvironment === 'production' ? 'Producdtion' : 'Test Mode'}
                      </span>
                    )}
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors" />
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-[300px] overflow-y-auto bg-white/90 backdrop-blur-xl border-slate-200 rounded-2xl shadow-xl p-2">
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 pb-2">Switch Workspace</p>
                {companies?.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => handleCompanyChange(company.id)}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 font-medium",
                      selectedCompanyId === company.id ? "bg-violet-50 text-violet-700 shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${selectedCompanyId === company.id ? 'bg-white text-violet-600 shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                      {company.logoUrl ? <img src={company.logoUrl} className="w-full h-full object-contain rounded-md" /> : company.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="truncate flex-1 font-bold font-display">{company.name}</span>
                    {selectedCompanyId === company.id && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                  </DropdownMenuItem>
                ))}
                <div className="h-px bg-slate-100 my-2" />
                <DropdownMenuItem onClick={() => setLocation("/onboarding")} className="flex items-center justify-center gap-2 p-3 text-white bg-slate-900 font-bold cursor-pointer hover:bg-slate-800 rounded-xl shadow-lg shadow-slate-900/10 active:scale-95 transition-all">
                  <Plus className="w-4 h-4" />
                  <span>New Company</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            if (item.children) {
              const isActiveGroup = item.children.some(child =>
                location + window.location.search === child.href || (location === child.href && !child.href.includes("?"))
              );

              const [isOpen, setIsOpen] = useState(isActiveGroup);

              // Keep open if a child is active
              useEffect(() => {
                if (isActiveGroup) setIsOpen(true);
              }, [isActiveGroup]);

              return (
                <Collapsible
                  key={item.label}
                  open={isOpen}
                  onOpenChange={setIsOpen}
                  className="space-y-1"
                >
                  <CollapsibleTrigger asChild>
                    <div
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer select-none group",
                        isActiveGroup
                          ? "bg-slate-50 text-slate-900 shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:ml-1"
                      )}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={cn("p-1.5 rounded-lg transition-colors", isActiveGroup ? "bg-white text-violet-600 shadow-sm" : "bg-transparent group-hover:bg-slate-200/50")}>
                          <item.icon className="w-4.5 h-4.5" />
                        </div>
                        <span className="font-display tracking-tight">{item.label}</span>
                      </div>
                      <ChevronDown
                        className={cn("w-4 h-4 text-slate-300 transition-transform duration-300", isOpen && "transform rotate-180 text-slate-500")}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-1 pb-2 pl-4">
                    <div className="pl-4 border-l-2 border-slate-100 space-y-1">
                      {item.children.map((child) => {
                        const isChildActive = location + window.location.search === child.href || (location === child.href && !child.href.includes("?"));
                        return (
                          <Link key={child.label} href={child.href}>
                            <div
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer w-full relative overflow-hidden active:scale-95",
                                isChildActive
                                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                              )}
                            >
                              {isChildActive && (
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                              )}
                              <span className="truncate tracking-wide">{child.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            const isActive = location + window.location.search === item.href || (location === item.href && !item.href?.includes("?"));
            return (
              <Link key={item.label} href={item.href!}>
                <div
                  className={cn(
                    "flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer select-none active:scale-95",
                    isActive
                      ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
                      : "text-slate-500 hover:bg-white hover:shadow-md hover:text-slate-900 hover:scale-[1.02]"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-slate-200" : "text-slate-400 group-hover:text-slate-600")} />
                  <span className="font-display tracking-tight">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 bg-slate-50/50 border-t border-slate-100/50">
          <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3" />
            <span>{brand.name} Managed Server</span>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 lg:ml-80 flex flex-col min-h-screen transition-all duration-300">

        {/* Top Header */}
        <header className="h-20 bg-transparent flex items-center justify-end gap-4 px-4 sm:px-8 pt-4 pb-2 z-40 sticky top-0 backdrop-blur-sm">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="mr-auto lg:hidden bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-xl shadow-sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
          </Button>

          {user.isSuperAdmin && (
            <div className="hidden sm:flex items-center gap-2 bg-amber-100/80 backdrop-blur-md border border-amber-200/50 px-4 py-1.5 rounded-full shadow-sm">
              <LogOut className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Global Super Admin</span>
            </div>
          )}

          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-white/40 p-1.5 rounded-full shadow-lg shadow-slate-200/50">
            {selectedCompanyId && <DeviceStatusWidget companyId={selectedCompanyId} />}

            <div className="h-6 w-px bg-slate-200 mx-1" />

            {selectedCompany?.subscriptionStatus !== 'active' && (
              <Link href="/subscription">
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors cursor-pointer group">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">
                    {selectedCompany?.subscriptionStatus || 'Inactive'}
                  </span>
                </div>
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full p-0 border-2 border-slate-100 hover:border-violet-200 transition-all hover:scale-105 active:scale-95 shadow-sm">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-xs font-black">
                      {user.name?.substring(0, 2).toUpperCase() || "US"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border-white/50 p-2 mt-2">
                <div className="flex items-center justify-start gap-3 p-3 bg-slate-50/50 rounded-xl mb-2">
                  <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-black text-sm">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col space-y-0.5 leading-none">
                    <div className="flex items-center gap-2">
                      {user.name && <p className="font-bold text-slate-900 font-display">{user.name}</p>}
                    </div>
                    {user.email && (
                      <p className="w-[140px] truncate text-xs font-medium text-slate-500">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuItem onClick={() => setLocation("/dashboard")} className="p-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02] transition-all">
                  <LayoutDashboard className="mr-3 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/settings")} className="p-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02] transition-all">
                  <UserCog className="mr-3 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/profile")} className="p-3 rounded-xl font-bold text-slate-600 cursor-pointer hover:bg-slate-50 hover:text-slate-900 hover:scale-[1.02] transition-all">
                  <UserCog className="mr-3 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <div className="h-px bg-slate-100 my-1" />
                <DropdownMenuItem className="p-3 rounded-xl font-bold text-red-600 focus:text-red-700 focus:bg-red-50 hover:bg-red-50 cursor-pointer active:scale-95 transition-all" onClick={() => logout()}>
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Password Warning Banner */}
        {user && user.passwordChanged === false && (
          <div className="mx-8 mt-4 rounded-xl bg-amber-50 border border-amber-200/60 p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3 text-amber-800 text-sm font-medium">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span><strong>Security Alert:</strong> You are using a temporary password. Please update it immediately.</span>
            </div>
            <Button size="sm" className="h-9 px-4 text-xs font-bold bg-white text-amber-700 border border-amber-200 shadow-sm hover:bg-amber-100 hover:border-amber-300 rounded-lg" onClick={() => setLocation("/profile")}>
              Update Password
            </Button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 pt-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
    </>
  );
}
