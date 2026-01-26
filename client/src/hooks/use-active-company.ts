
import { useState, useEffect } from "react";
import { useCompanies } from "./use-companies";

export function useActiveCompany() {
    const { data: companies, isLoading } = useCompanies();
    const [activeCompanyId, setActiveCompanyId] = useState<number | null>(() => {
        const stored = localStorage.getItem("selectedCompanyId");
        return stored ? parseInt(stored) : null;
    });

    useEffect(() => {
        if (!isLoading && companies && companies.length > 0) {
            // If no company is selected, or the selected company is no longer available
            if (!activeCompanyId || !companies.find(c => c.id === activeCompanyId)) {
                const firstId = companies[0].id;
                setActiveCompanyId(firstId);
                localStorage.setItem("selectedCompanyId", firstId.toString());
            }
        }
    }, [companies, isLoading, activeCompanyId]);

    const setCompany = (id: number) => {
        setActiveCompanyId(id);
        localStorage.setItem("selectedCompanyId", id.toString());
        // Trigger a page reload to ensure all queries are refreshed with new company context
        window.location.reload();
    };

    const activeCompany = companies?.find(c => c.id === activeCompanyId) || companies?.[0];

    return {
        activeCompany,
        activeCompanyId: activeCompany?.id || null,
        setCompany,
        isLoading
    };
}
