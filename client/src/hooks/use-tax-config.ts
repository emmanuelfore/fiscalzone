
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiFetch } from "@/lib/api";

export function useTaxConfig(companyId?: number) {
    const taxTypes = useQuery({
        queryKey: [api.tax.types.path, companyId],
        queryFn: async () => {
            const path = companyId ? `${api.tax.types.path}?companyId=${companyId}` : api.tax.types.path;
            const res = await apiFetch(path);
            if (!res.ok) throw new Error("Failed to fetch tax types");
            return api.tax.types.responses[200].parse(await res.json());
        },
        enabled: !!companyId,
    });

    const taxCategories = useQuery({
        queryKey: [api.tax.categories.path, companyId],
        queryFn: async () => {
            const path = companyId ? `${api.tax.categories.path}?companyId=${companyId}` : api.tax.categories.path;
            const res = await apiFetch(path);
            if (!res.ok) throw new Error("Failed to fetch tax categories");
            return api.tax.categories.responses[200].parse(await res.json());
        },
        enabled: !!companyId,
    });

    return {
        taxTypes,
        taxCategories,
        isLoading: taxTypes.isLoading || taxCategories.isLoading,
    };
}
