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
  BarChart3
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { CreateCompanyDialog } from "./create-company-dialog";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
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
        setSelectedCompanyId(companies[0].id);
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

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    // { icon: ClipboardList, label: "Quotations", href: "/quotations" },
    { icon: FileText, label: "Invoices", href: "/invoices" },
    { icon: Users, label: "Customers", href: "/customers" },
    { icon: Package, label: "Products", href: "/products" },
    { icon: Briefcase, label: "Services", href: "/services" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Coins, label: "Currencies", href: "/currencies" },
    { icon: Calculator, label: "Tax Config", href: "/tax-config" },
    { icon: Server, label: "ZIMRA Device", href: "/zimra-settings" },
    { icon: UserCog, label: "Team", href: "/team-settings" },
    { icon: Settings, label: "Settings", href: "/settings" },
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
            const isActive = location + window.location.search === item.href || (location === item.href && !item.href.includes("?"));
            return (
              <Link key={item.label} href={item.href}>
                <div
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer
                    ${isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-slate-400"}`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {user.email?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
