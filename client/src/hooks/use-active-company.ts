
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
                // Stored company doesn't exist for this user or we are at first login
                // If there's a company where they are an owner/admin/member, prefer that (for dashboard)
                const managementCompany = companies.find(c => ['owner', 'admin', 'member'].includes((c as any).role));
                // Otherwise, if they only have cashier roles, pick a cashier company
                const cashierCompany = companies.find(c => (c as any).role === 'cashier');

                const defaultId = managementCompany ? managementCompany.id : (cashierCompany ? cashierCompany.id : companies[0].id);

                setActiveCompanyId(defaultId);
                localStorage.setItem("selectedCompanyId", defaultId.toString());
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
