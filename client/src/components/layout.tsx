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
  Receipt
} from "lucide-react";
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
  const { data: companies } = useCompanies();
  const { activeCompany, activeCompanyId, setCompany } = useActiveCompany();

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
        { icon: Package, label: "Products", href: "/products" },
        { icon: Briefcase, label: "Services", href: "/services" },
      ]
    },
    {
      icon: Building2,
      label: "Finance & Reports",
      children: [
        { icon: MonitorCheck, label: "POS Reports", href: "/reports/pos" },
        { icon: History, label: "Recent Sales Ledger", href: "/pos/all-sales" },
        { icon: Package, label: "Inventory Reports", href: "/reports/inventory" },
        { icon: FileText, label: "Tax & ZIMRA", href: "/reports/tax" },
        { icon: Coins, label: "Currencies", href: "/currencies" },
        { icon: Calculator, label: "Tax Config", href: "/tax-config" },
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

  const isCashier = activeRole === 'cashier';

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
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 border-b border-slate-100/50">
          <div className="flex items-center gap-3 mb-6">
            <img src="/fiscalstack-logo.png" alt="FiscalStack" className="h-10" />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                    {selectedCompany?.logoUrl ? (
                      <img src={selectedCompany.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="overflow-hidden flex-1 text-left">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Entity</p>
                      {user.isSuperAdmin && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-600 px-1.5 py-0 rounded-full font-bold uppercase tracking-wider">Super</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-900 truncate flex items-center gap-1">
                      {selectedCompany ? selectedCompany.name : "Setup Required"}
                      {selectedCompany && (
                        <span className={`text-[8px] px-1 rounded font-bold uppercase ${selectedCompany.zimraEnvironment === 'production' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {selectedCompany.zimraEnvironment === 'production' ? 'PROD' : 'TEST'}
                        </span>
                      )}
                      <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    </p>
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-[300px] overflow-y-auto bg-white border-slate-200">
              <div className="p-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-2">Your Companies</p>
                {companies?.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => handleCompanyChange(company.id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                      selectedCompanyId === company.id ? "bg-primary/10 text-primary font-semibold" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-500 overflow-hidden text-[10px]">
                      {company.logoUrl ? <img src={company.logoUrl} className="w-full h-full object-contain" /> : <Building2 className="w-3 h-3" />}
                    </div>
                    <span className="truncate flex-1">{company.name}</span>
                  </DropdownMenuItem>
                ))}
                <div className="h-px bg-slate-100 my-2" />
                <DropdownMenuItem onClick={() => setLocation("/onboarding")} className="flex items-center gap-2 p-2 text-primary font-medium cursor-pointer hover:bg-primary/5 rounded-lg">
                  <Plus className="w-4 h-4" />
                  <span>Register New Company</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
                        "flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                        isActiveGroup && "text-slate-900 font-semibold"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("w-5 h-5", isActiveGroup ? "text-primary" : "text-slate-400")} />
                        {item.label}
                      </div>
                      <ChevronDown
                        className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isOpen && "transform rotate-180")}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1">
                    {item.children.map((child) => {
                      const isChildActive = location + window.location.search === child.href || (location === child.href && !child.href.includes("?"));
                      return (
                        <Link key={child.label} href={child.href}>
                          <div
                            className={cn(
                              "flex items-center gap-3 pl-11 pr-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                              isChildActive
                                ? "bg-primary/10 text-primary shadow-sm"
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                            )}
                          >
                            <span className="truncate">{child.label}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            }

            const isActive = location + window.location.search === item.href || (location === item.href && !item.href?.includes("?"));
            return (
              <Link key={item.label} href={item.href!}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-slate-400")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          {/* Footer removed - moved to top header */}
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">

        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-8 flex items-center justify-end gap-3">
          {user.isSuperAdmin && (
            <div className="mr-auto flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full shadow-sm">
              <LogOut className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Global Super Admin Access</span>
            </div>
          )}
          {selectedCompanyId && <DeviceStatusWidget companyId={selectedCompanyId} />}
          {selectedCompany?.subscriptionStatus !== 'active' && (
            <Link href="/subscription">
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full shadow-sm hover:bg-red-100 transition-colors cursor-pointer">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">
                  Subscription {selectedCompany?.subscriptionStatus || 'Inactive'}
                </span>
              </div>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 w-10 rounded-full p-0 border border-slate-200 hover:bg-slate-100 transition-colors">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {user.name?.substring(0, 2).toUpperCase() || "US"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <div className="flex items-center gap-2">
                    {user.name && <p className="font-medium">{user.name}</p>}
                    {user.isSuperAdmin && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Super Admin</span>
                    )}
                  </div>
                  {user.email && (
                    <p className="w-[200px] truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="h-px bg-slate-100 my-1" />
              <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                <UserCog className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/profile")}>
                <UserCog className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <div className="h-px bg-slate-100 my-1" />
              <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Password Warning Banner */}
        {user && user.passwordChanged === false && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <LogOut className="w-4 h-4" />
              <span>You are using a <strong>default password</strong>. For security, please update your password in your profile.</span>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs border-amber-300 text-amber-900 bg-white hover:bg-amber-100" onClick={() => setLocation("/profile")}>
              Change Password
            </Button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
