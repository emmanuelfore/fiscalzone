import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type CreateInvoiceRequest } from "@shared/schema";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useInvoices(companyId: number) {
  return useQuery({
    queryKey: [api.invoices.list.path, companyId],
    queryFn: async () => {
      const url = buildUrl(api.invoices.list.path, { companyId });
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      return api.invoices.list.responses[200].parse(await res.json());
    },
    enabled: !!companyId,
  });
}

export function useInvoice(id: number) {
  return useQuery({
    queryKey: [api.invoices.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.invoices.get.path, { id });
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch invoice");
      return api.invoices.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateInvoice(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateInvoiceRequest) => {
      const url = buildUrl(api.invoices.create.path, { companyId });
      const res = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create invoice");
      }
      return api.invoices.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path, companyId] });
    },
  });
}

export function useFiscalizeInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.invoices.fiscalize.path, { id });
      const res = await apiFetch(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to fiscalize invoice");
      }
      return api.invoices.fiscalize.responses[200].parse(await res.json());
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.get.path, id] });
      // Also invalidate list if we are viewing the list
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      toast({
        title: "Invoice Fiscalized Successfully",
        description: `Fiscal Number: ${data.fiscalCode}`,
        className: "bg-green-100 text-green-900"
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Fiscalization Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl("/api/invoices/:id", { id });
      const res = await apiFetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete invoice");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
    },
  });
}
