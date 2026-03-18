
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertExpense, type Expense } from "@shared/schema";
import { apiFetch } from "@/lib/api";

export function useExpenses(companyId: number) {
    return useQuery({
        queryKey: [api.expenses.list.path, companyId],
        queryFn: async () => {
            const url = buildUrl(api.expenses.list.path, { companyId });
            const res = await apiFetch(url);
            if (!res.ok) throw new Error("Failed to fetch expenses");
            return api.expenses.list.responses[200].parse(await res.json());
        },
        enabled: !!companyId,
    });
}

export function useCreateExpense(companyId: number) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: Omit<InsertExpense, "companyId">) => {
            const url = buildUrl(api.expenses.create.path, { companyId });
            const res = await apiFetch(url, {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create expense");
            }
            return api.expenses.create.responses[201].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.expenses.list.path, companyId] });
        },
    });
}

export function useUpdateExpense() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertExpense> }) => {
            const url = buildUrl(api.expenses.update.path, { id });
            const res = await apiFetch(url, {
                method: "PATCH",
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update expense");
            return api.expenses.update.responses[200].parse(await res.json());
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.expenses.list.path] });
        },
    });
}
