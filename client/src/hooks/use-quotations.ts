import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Quotation, type InsertQuotation, type InsertQuotationItem } from "@shared/schema";
import { apiFetch } from "@/lib/api";
import { useToast } from "./use-toast";

export function useQuotations(companyId: number) {
    return useQuery<Quotation[]>({
        queryKey: ["quotations", companyId],
        queryFn: async () => {
            if (!companyId) return [];
            const res = await apiFetch(`/api/companies/${companyId}/quotations`);
            if (!res.ok) throw new Error("Failed to fetch quotations");
            return await res.json();
        },
        enabled: !!companyId,
    });
}

export function useQuotation(id: number) {
    return useQuery<Quotation & { items: any[]; customer: any }>({
        queryKey: ["quotations", id],
        queryFn: async () => {
            const res = await apiFetch(`/api/quotations/${id}`);
            if (!res.ok) throw new Error("Failed to fetch quotation");
            return await res.json();
        },
        enabled: !!id,
    });
}

export function useCreateQuotation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: InsertQuotation & { items: InsertQuotationItem[] }) => {
            const res = await apiFetch("/api/quotations", {
                method: "POST",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to create quotation");
            }
            return await res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["quotations"] });
            toast({ title: "Quotation Created", description: `Quotation ${data.quotationNumber} saved as draft.` });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useUpdateQuotation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<InsertQuotation> & { items?: InsertQuotationItem[] } }) => {
            const res = await apiFetch(`/api/quotations/${id}`, {
                method: "PATCH",
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to update quotation");
            }
            return await res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["quotations"] });
            toast({ title: "Quotation Updated", description: `Quotation ${data.quotationNumber} updated successfully.` });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useDeleteQuotation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiFetch(`/api/quotations/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete quotation");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotations"] });
            toast({ title: "Quotation Deleted" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}

export function useConvertToInvoice() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: number) => {
            const res = await apiFetch(`/api/quotations/${id}/convert`, { method: "POST" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to convert quotation");
            }
            return await res.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["quotations"] });
            queryClient.invalidateQueries({ queryKey: ["invoices"] });
            toast({ title: "Conversion Successful", description: `Created Invoice ${data.invoiceNumber}.` });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });
}
