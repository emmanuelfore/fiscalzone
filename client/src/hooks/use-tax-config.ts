
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiFetch } from "@/lib/api";

export function useTaxConfig() {
    const taxTypes = useQuery({
        queryKey: [api.tax.types.path],
        queryFn: async () => {
            const res = await apiFetch(api.tax.types.path);
            if (!res.ok) throw new Error("Failed to fetch tax types");
            return api.tax.types.responses[200].parse(await res.json());
        },
    });

    const taxCategories = useQuery({
        queryKey: [api.tax.categories.path],
        queryFn: async () => {
            const res = await apiFetch(api.tax.categories.path);
            if (!res.ok) throw new Error("Failed to fetch tax categories");
            return api.tax.categories.responses[200].parse(await res.json());
        },
    });

    return {
        taxTypes,
        taxCategories,
        isLoading: taxTypes.isLoading || taxCategories.isLoading,
    };
}
