import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBranches } from "@/hooks/use-branches";
import { Store, MapPin, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { setSelectedBranchId as setLocalBranchId } from "@/lib/api";

interface BranchPickerModalProps {
  companyId: number;
  selectedBranchId: number | null;
  onSelect: (branchId: number | null) => void;
  trigger?: React.ReactNode;
}

export function BranchPickerModal({ 
  companyId, 
  selectedBranchId, 
  onSelect, 
  trigger 
}: BranchPickerModalProps) {
  const { data: branches, isLoading } = useBranches(companyId);
  const [open, setOpen] = useState(false);

  const handleSelect = (id: number | null) => {
    setLocalBranchId(id);
    onSelect(id);
    setOpen(false);
    // Reload components that depend on branch
    window.location.reload(); 
  };

  const currentBranch = branches?.find(b => b.id === selectedBranchId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 rounded-xl">
            <Store className="w-4 h-4" />
            {currentBranch ? currentBranch.name : "Select Branch"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden">
        <DialogHeader className="bg-slate-900 text-white p-8 pb-10">
          <DialogTitle className="text-2xl font-black">Switch Branch</DialogTitle>
          <DialogDescription className="text-slate-400 font-medium pt-1">
            Select a physical location to scope your POS terminal and inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-3 -mt-6 bg-white rounded-t-[2rem] max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-300" />
            </div>
          ) : branches?.length === 0 ? (
            <div className="text-center py-12">
               <Store className="w-12 h-12 text-slate-200 mx-auto mb-4" />
               <p className="text-slate-400 font-bold">No branches configured.</p>
               <p className="text-xs text-slate-300">Go to Settings &gt; Branches to add one.</p>
            </div>
          ) : (
            <>
              {branches?.map((branch) => (
                <button
                  key={branch.id}
                  onClick={() => handleSelect(branch.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group relative",
                    selectedBranchId === branch.id 
                      ? "border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-100" 
                      : "border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                    selectedBranchId === branch.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                  )}>
                    <Store className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className={cn(
                      "font-black text-sm leading-tight",
                      selectedBranchId === branch.id ? "text-blue-900" : "text-slate-700"
                    )}>
                      {branch.name}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" /> {branch.city || "Unknown City"}
                    </p>
                  </div>
                  {selectedBranchId === branch.id && (
                    <CheckCircle2 className="w-5 h-5 text-blue-600 ml-auto" />
                  )}
                </button>
              ))}
              
              <div className="pt-4 border-t border-slate-50 mt-4">
                <button 
                  onClick={() => handleSelect(null)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all font-bold text-xs text-slate-500",
                    !selectedBranchId && "border-blue-600 bg-blue-50/50 text-blue-600"
                  )}
                >
                   Clear Selection (Main Company Only)
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
