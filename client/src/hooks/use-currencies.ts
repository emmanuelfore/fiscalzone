
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCurrency, type Currency } from "@shared/schema";
import { apiFetch } from "@/lib/api";
import { cacheCurrencies, getCachedCurrencies } from "@/lib/offline-db";

export function useCurrencies(companyId: number) {
    return useQuery({
        queryKey: [api.currencies.list.path, companyId],
        queryFn: async () => {
            try {
                const url = buildUrl(api.currencies.list.path, { companyId });
                const res = await apiFetch(url);
                if (!res.ok) throw new Error("Failed to fetch currencies");
                const currencies = api.currencies.list.responses[200].parse(await res.json());
                if (companyId) await cacheCurrencies(companyId, currencies);
                return currencies;
            } catch (err) {
                console.warn("Currencies fetch failed, trying offline cache...", err);
                const cached = await getCachedCurrencies(companyId);
                if (cached && cached.length > 0) return cached;
                throw err;
            }
        },
        enabled: !!companyId,
    });
}

export function useCreateCurrency(companyId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Omit<InsertCurrency, "companyId">) => {
            const url = buildUrl(api.currencies.create.path, { companyId });
            const res = await apiFetch(url, {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Failed to create currency");
            }
            return api.currencies.create.responses[201].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.currencies.list.path, companyId] });
        },
    });
}

export function useUpdateCurrency() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCurrency> }) => {
            const url = buildUrl(api.currencies.update.path, { id });
            const res = await apiFetch(url, {
                method: "PATCH",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update currency");
            return api.currencies.update.responses[200].parse(await res.json());
        },
        onSuccess: (_, variables) => {
            // Invalidate specific currency and list
            queryClient.invalidateQueries({ queryKey: [api.currencies.list.path] });
        },
    });
}

export function useDeleteCurrency() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const url = buildUrl(api.currencies.delete.path, { id });
            const res = await apiFetch(url, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete currency");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.currencies.list.path] });
        },
    });
}
