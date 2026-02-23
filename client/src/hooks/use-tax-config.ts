
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiFetch } from "@/lib/api";
import { cacheTaxConfig, getCachedTaxConfig } from "@/lib/offline-db";

export function useTaxConfig(companyId?: number) {
    const taxTypes = useQuery({
        queryKey: [api.tax.types.path, companyId],
        queryFn: async () => {
            try {
                const path = companyId ? `${api.tax.types.path}?companyId=${companyId}` : api.tax.types.path;
                const res = await apiFetch(path);
                if (!res.ok) throw new Error("Failed to fetch tax types");
                const data = api.tax.types.responses[200].parse(await res.json());

                // Partial cache update: we have types, let's try to preserve categories from cache if possible
                if (companyId) {
                    const existing = await getCachedTaxConfig(companyId) || {};
                    await cacheTaxConfig(companyId, { ...existing, types: data });
                }
                return data;
            } catch (err) {
                console.warn("Tax types fetch failed, trying offline cache...", err);
                if (companyId) {
                    const cached = await getCachedTaxConfig(companyId);
                    if (cached?.types) return cached.types;
                }
                throw err;
            }
        },
        enabled: !!companyId,
    });

    const taxCategories = useQuery({
        queryKey: [api.tax.categories.path, companyId],
        queryFn: async () => {
            try {
                const path = companyId ? `${api.tax.categories.path}?companyId=${companyId}` : api.tax.categories.path;
                const res = await apiFetch(path);
                if (!res.ok) throw new Error("Failed to fetch tax categories");
                const data = api.tax.categories.responses[200].parse(await res.json());

                // Partial cache update: we have categories, let's try to preserve types from cache if possible
                if (companyId) {
                    const existing = await getCachedTaxConfig(companyId) || {};
                    await cacheTaxConfig(companyId, { ...existing, categories: data });
                }
                return data;
            } catch (err) {
                console.warn("Tax categories fetch failed, trying offline cache...", err);
                if (companyId) {
                    const cached = await getCachedTaxConfig(companyId);
                    if (cached?.categories) return cached.categories;
                }
                throw err;
            }
        },
        enabled: !!companyId,
    });

    return {
        taxTypes,
        taxCategories,
        isLoading: taxTypes.isLoading || taxCategories.isLoading,
    };
}
