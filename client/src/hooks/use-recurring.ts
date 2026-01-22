import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type RecurringInvoice, type InsertRecurringInvoice } from "@shared/schema";
import { apiFetch } from "@/lib/api";
import { useToast } from "./use-toast";

export function useRecurringInvoices(companyId: number) {
    return useQuery<RecurringInvoice[]>({
        queryKey: ["recurring-invoices", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await apiFetch(`/api/companies/${companyId}/recurring-invoices`);
            if (!res.ok) throw new Error("Failed to fetch recurring invoices");
            return await res.json();
        },
        enabled: !!companyId,
    });
}

export function useCreateRecurringInvoice() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: InsertRecurringInvoice) => {
            const res = await apiFetch("/api/recurring-invoices", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create recurring invoice");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
            toast({ title: "Schedule Created", description: "Recurring invoice schedule saved successfully." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useUpdateRecurringInvoice() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertRecurringInvoice> }) => {
            const res = await apiFetch(`/api/recurring-invoices/${id}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to update recurring invoice");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
            toast({ title: "Schedule Updated", description: "Recurring invoice schedule updated successfully." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useDeleteRecurringInvoice() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiFetch(`/api/recurring-invoices/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete recurring invoice");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
            toast({ title: "Schedule Deleted" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}
