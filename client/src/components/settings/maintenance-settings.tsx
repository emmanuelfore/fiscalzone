import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, RefreshCw, Loader2, Database } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MaintenanceSettingsProps {
  company: any;
}

export function MaintenanceSettings({ company }: MaintenanceSettingsProps) {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { mutate: clearData, isPending } = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/companies/${company.id}/maintenance/clear-data`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to clear data");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Data Cleared",
        description: data.message,
        className: "bg-emerald-600 text-white border-none rounded-2xl",
      });
      setConfirmText("");
      setIsDialogOpen(false);
      // Optional: Redirect or reload to reflect clean state
      setTimeout(() => window.location.href = "/dashboard", 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Maintenance & Data Management</h2>
        <p className="text-sm text-slate-500">System maintenance tools and data clearing options</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="card-depth border-red-100 bg-red-50/30">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Factory Reset Transactions
            </CardTitle>
            <CardDescription className="text-red-700/70">
              Permanently delete all sales, invoices, and payment history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-900">What will be deleted?</h4>
              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                <li>All Invoices and Invoice Items</li>
                <li>All Payment records</li>
                <li>All POS Shifts and Transactions</li>
                <li>All Inventory Ledger entries (Stock levels will be reset to 0)</li>
                <li>All Expenses and Audit Logs</li>
                <li>ZIMRA transmission logs</li>
                <li>Fiscal counters (Receipt Numbers, etc.) will be reset to zero</li>
              </ul>
              <div className="pt-2">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                  Caution: This action cannot be undone. Always backup your data first.
                </p>
              </div>
            </div>

            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-12 rounded-2xl font-black gap-2 shadow-lg shadow-red-200 active:scale-95 transition-all">
                  <Trash2 className="w-4 h-4" />
                  Clear All Sales & Transactions
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="text-red-500 w-6 h-6" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-500 font-medium py-4">
                    This will permanently destroy all financial records for <span className="font-bold text-slate-900">{company.name}</span>. 
                    The dashboard will be completely reset. This action is irreversible.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Type "DELETE EVERYTHING" to confirm</Label>
                    <Input 
                      placeholder="Confirmation text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="h-12 rounded-xl border-slate-200 focus:ring-red-500/10 focus:border-red-500 font-bold"
                    />
                  </div>
                </div>

                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="h-12 rounded-xl font-bold border-slate-200">Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    disabled={isPending || confirmText !== "DELETE EVERYTHING"}
                    onClick={(e) => {
                      e.preventDefault();
                      clearData();
                    }}
                    className="h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white min-w-[140px]"
                  >
                    {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Destroy All Data"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card className="card-depth border-none opacity-50 grayscale cursor-not-allowed">
          <CardHeader>
            <CardTitle className="flex items-center text-lg text-slate-600">
              <Database className="w-5 h-5 mr-2" />
              Backup & Restore
            </CardTitle>
            <CardDescription>Export/Import full system snapshots</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl m-6 mt-0">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Coming Soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
