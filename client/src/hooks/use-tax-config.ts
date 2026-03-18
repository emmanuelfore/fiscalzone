
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiFetch } from "@/lib/api";
import { cacheTaxConfig, getCachedTaxConfig } from "@/lib/offline-db";
import { getIsOnline } from "@/lib/online-state";

export function useTaxConfig(companyId?: number) {
    const taxTypes = useQuery({
        queryKey: [api.tax.types.path, companyId],
        queryFn: async () => {
            if (!getIsOnline() && companyId) {
                const cached = await getCachedTaxConfig(companyId);
                if (cached?.types) return cached.types;
                return [];
            }
            try {
                const path = companyId ? `${api.tax.types.path}?companyId=${companyId}` : api.tax.types.path;
                const res = await apiFetch(path);
                if (!res.ok) throw new Error("Failed to fetch tax types");
                const data = api.tax.types.responses[200].parse(await res.json());
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
        retry: false,
    });

    const taxCategories = useQuery({
        queryKey: [api.tax.categories.path, companyId],
        queryFn: async () => {
            if (!getIsOnline() && companyId) {
                const cached = await getCachedTaxConfig(companyId);
                if (cached?.categories) return cached.categories;
                return [];
            }
            try {
                const path = companyId ? `${api.tax.categories.path}?companyId=${companyId}` : api.tax.categories.path;
                const res = await apiFetch(path);
                if (!res.ok) throw new Error("Failed to fetch tax categories");
                const data = api.tax.categories.responses[200].parse(await res.json());
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
        retry: false,
    });

    return {
        taxTypes,
        taxCategories,
        isLoading: taxTypes.isLoading || taxCategories.isLoading,
    };
}
