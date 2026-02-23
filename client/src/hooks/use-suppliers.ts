import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertSupplier } from "@shared/schema";
import { apiFetch } from "@/lib/api";

export function useSuppliers(companyId: number) {
    return useQuery({
        queryKey: [api.suppliers.list.path, companyId],
        queryFn: async () => {
            const url = buildUrl(api.suppliers.list.path, { companyId });
            const res = await apiFetch(url);
            if (!res.ok) throw new Error("Failed to fetch suppliers");
            return api.suppliers.list.responses[200].parse(await res.json());
        },
        enabled: !!companyId,
    });
}

export function useCreateSupplier(companyId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: InsertSupplier) => {
            const url = buildUrl(api.suppliers.create.path, { companyId });
            const res = await apiFetch(url, {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to create supplier");
            return api.suppliers.create.responses[201].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.suppliers.list.path, companyId] });
        },
    });
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertSupplier> }) => {
            const url = buildUrl(api.suppliers.update.path, { id });
            const res = await apiFetch(url, {
                method: "PATCH",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update supplier");
            return api.suppliers.update.responses[200].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.suppliers.list.path] });
        },
    });
}
