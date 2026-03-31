import React from "react";
import { useBranchContext } from "@/lib/branch-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MapPin, ChevronDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BranchSwitcher() {
  const { branches, selectedBranch, setSelectedBranchId, isLoading } = useBranchContext();

  if (isLoading && branches.length === 0) {
    return (
      <div className="h-10 w-32 bg-slate-100 animate-pulse rounded-full" />
    );
  }

  // If there are no branches, maybe show a message or just don't show the switcher
  if (branches.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-4 rounded-full border-slate-200 bg-white/50 backdrop-blur-sm hover:bg-white hover:border-violet-200 transition-all group shadow-sm active:scale-95"
        >
          <MapPin className="w-4 h-4 mr-2 text-slate-400 group-hover:text-violet-500 transition-colors" />
          <span className="text-sm font-bold text-slate-700 truncate max-w-[120px] font-display">
            {selectedBranch ? selectedBranch.name : "All Branches"}
          </span>
          <ChevronDown className="w-4 h-4 ml-2 text-slate-300 group-hover:text-violet-400 transition-colors" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-white/95 backdrop-blur-xl border-slate-200 rounded-2xl shadow-2xl p-2 mt-2"
      >
        <div className="px-3 py-2 border-b border-slate-100 mb-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Location</p>
        </div>
        
        <DropdownMenuItem
          onClick={() => setSelectedBranchId(null)}
          className={cn(
            "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all font-medium mb-1",
            !selectedBranch ? "bg-violet-50 text-violet-700 font-bold" : "text-slate-600 hover:bg-slate-50"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center text-xs",
            !selectedBranch ? "bg-white text-violet-600 shadow-sm" : "bg-slate-100 text-slate-400"
          )}>
            <Building2 className="w-4 h-4" />
          </div>
          <span className="flex-1 font-display">All Branches</span>
          {!selectedBranch && <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
        </DropdownMenuItem>

        {branches.map((branch) => (
          <DropdownMenuItem
            key={branch.id}
            onClick={() => setSelectedBranchId(branch.id)}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all font-medium",
              selectedBranch?.id === branch.id ? "bg-violet-50 text-violet-700 font-bold" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-xs",
              selectedBranch?.id === branch.id ? "bg-white text-violet-600 shadow-sm" : "bg-slate-100 text-slate-400"
            )}>
              <MapPin className="w-4 h-4" />
            </div>
            <span className="flex-1 font-display truncate">{branch.name}</span>
            {selectedBranch?.id === branch.id && <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
