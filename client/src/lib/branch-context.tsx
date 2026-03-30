import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type Branch } from "@shared/schema";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useBranches } from "@/hooks/use-branches";
import { queryClient } from "./queryClient";

interface BranchContextType {
  selectedBranchId: number | null;
  selectedBranch: Branch | null;
  setSelectedBranchId: (id: number | null) => void;
  isLoading: boolean;
  branches: Branch[];
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { activeCompany } = useActiveCompany();
  const { branches = [], isLoading } = useBranches(activeCompany?.id);
  
  const [selectedBranchId, setInternalSelectedBranchId] = useState<number | null>(() => {
    const saved = localStorage.getItem("selectedBranchId");
    return saved ? parseInt(saved) : null;
  });

  const setSelectedBranchId = (id: number | null) => {
    setInternalSelectedBranchId(id);
    if (id) {
      localStorage.setItem("selectedBranchId", id.toString());
    } else {
      localStorage.removeItem("selectedBranchId");
    }
    // Invalidate queries when branch changes to refresh data (products, shifts, etc.)
    queryClient.invalidateQueries();
  };

  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null;

  // Auto-select first branch if none selected and branches exist
  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      // For now, don't auto-select to allow "All Branches" view if supported by backend
      // But usually in POS, you must be in a branch.
    }
  }, [branches, selectedBranchId]);

  return (
    <BranchContext.Provider value={{
      selectedBranchId,
      selectedBranch,
      setSelectedBranchId,
      isLoading,
      branches
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error("useBranchContext must be used within a BranchProvider");
  }
  return context;
}
