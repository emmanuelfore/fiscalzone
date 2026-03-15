import { useState, useEffect, useRef } from "react";
import { useCompanies } from "./use-companies";

export function useActiveCompany(enabled: boolean = true) {
    const { data: companies, isLoading } = useCompanies(enabled);
    const [activeCompanyId, setActiveCompanyId] = useState<number | null>(() => {
        const stored = localStorage.getItem("selectedCompanyId");
        return stored ? parseInt(stored) : null;
    });
    // Use a ref to read activeCompanyId inside the effect without adding it to deps
    const activeCompanyIdRef = useRef(activeCompanyId);
    activeCompanyIdRef.current = activeCompanyId;

    useEffect(() => {
        if (!isLoading && companies && companies.length > 0) {
            const storedCompany = companies.find(c => c.id === activeCompanyIdRef.current);

            if (!storedCompany) {
                const bestCompany =
                    companies.find(c => c.role === "owner") ||
                    companies.find(c => c.role === "cashier") ||
                    companies[0];

                const finalId = bestCompany.id;
                setActiveCompanyId(finalId);
                localStorage.setItem("selectedCompanyId", finalId.toString());
            }
        } else if (!isLoading && companies && companies.length === 0) {
            if (activeCompanyIdRef.current !== null) {
                setActiveCompanyId(null);
                localStorage.removeItem("selectedCompanyId");
            }
        }
    }, [companies, isLoading]); // removed activeCompanyId — read via ref to avoid loop

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
        isLoading: enabled ? isLoading : false
    };
}