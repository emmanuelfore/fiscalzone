
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
            // Validate that the stored company ID actually belongs to this user
            const storedCompany = companies.find(c => c.id === activeCompanyId);

            if (!storedCompany) {
                // Stored company doesn't exist for this user, select the first available
                const firstId = companies[0].id;
                setActiveCompanyId(firstId);
                localStorage.setItem("selectedCompanyId", firstId.toString());
            }
        } else if (!isLoading && companies && companies.length === 0) {
            // User has no companies, clear any stale localStorage value
            if (activeCompanyId !== null) {
                setActiveCompanyId(null);
                localStorage.removeItem("selectedCompanyId");
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
