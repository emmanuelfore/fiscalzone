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
  RefreshCw
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
  }[];
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { data: companies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  // Auto-select first company
  useEffect(() => {
    if (companies && companies.length > 0 && !selectedCompanyId) {
      const stored = localStorage.getItem("selectedCompanyId");
      if (stored && companies.find(c => c.id === parseInt(stored))) {
        setSelectedCompanyId(parseInt(stored));
      } else {
        const firstCompanyId = companies[0].id;
        setSelectedCompanyId(firstCompanyId);
        localStorage.setItem("selectedCompanyId", firstCompanyId.toString());
        // Reload to ensure all components get the correct company ID
        window.location.reload();
      }
    }
  }, [companies, selectedCompanyId]);

  const handleCompanyChange = (id: number) => {
    setSelectedCompanyId(id);
    localStorage.setItem("selectedCompanyId", id.toString());
    // Refresh page or trigger a context update in a real app
    window.location.reload();
  };

  const selectedCompany = companies?.find(c => c.id === selectedCompanyId);

  const navItems: NavItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
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
      label: "Finance",
      children: [
        { icon: BarChart3, label: "Reports", href: "/reports" },
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
      ]
    },
    {
      icon: Settings,
      label: "Administration",
      children: [
        { icon: UserCog, label: "Team", href: "/team-settings" },
        { icon: Settings, label: "Settings", href: "/settings" },
      ]
    }
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 border-b border-slate-100/50">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
              <span className="font-display font-bold text-xl">F</span>
            </div>
            <div>
              <span className="font-display font-bold text-xl tracking-tight text-slate-900 block leading-none">FiscZim</span>
              <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full tracking-wide">PRO</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden shadow-sm">
                {selectedCompany?.logoUrl ? (
                  <img src={selectedCompany.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-4 h-4" />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Active Entity</p>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {selectedCompany ? selectedCompany.name : "Setup Required"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
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
          {selectedCompanyId && <DeviceStatusWidget companyId={selectedCompanyId} />}
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
                  {user.name && <p className="font-medium">{user.name}</p>}
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
