
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InventoryTransaction } from "@shared/schema";
import { apiFetch } from "@/lib/api";

export function useInventoryTransactions(companyId: number) {
    return useQuery({
        queryKey: [api.inventory.transactions.path, companyId],
        queryFn: async () => {
            const url = buildUrl(api.inventory.transactions.path, { companyId });
            const res = await apiFetch(url);
            if (!res.ok) throw new Error("Failed to fetch inventory transactions");
            return api.inventory.transactions.responses[200].parse(await res.json());
        },
        enabled: !!companyId,
    });
}

export function useStockIn(companyId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: {
            productId: number;
            quantity: number | string;
            unitCost: number | string;
            supplierId?: number;
            notes?: string;
        }) => {
            const url = buildUrl(api.inventory.stockIn.path, { companyId });
            const res = await apiFetch(url, {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to record stock-in");
            }
            return api.inventory.stockIn.responses[201].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.inventory.transactions.path, companyId] });
            // Also invalidate products to reflect new stock levels
            queryClient.invalidateQueries({ queryKey: [api.products.list.path, companyId] });
        },
    });
}

export function useBatchStockIn(companyId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: {
            supplierId?: number;
            notes?: string;
            items: { productId: number; quantity: number | string; unitCost: number | string }[];
        }) => {
            const url = buildUrl(api.inventory.batchStockIn.path, { companyId });
            const res = await apiFetch(url, {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to record batch stock-in");
            }
            return api.inventory.batchStockIn.responses[201].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.inventory.transactions.path, companyId] });
            queryClient.invalidateQueries({ queryKey: [api.products.list.path, companyId] });
            queryClient.invalidateQueries({ queryKey: [api.reports.stockValuation.path, companyId] });
        },
    });
}
