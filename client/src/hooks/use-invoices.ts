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

import { getZimraErrorMessage } from "@/lib/zimra-errors";

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreateInvoiceRequest> }) => {
      const url = buildUrl(api.invoices.update.path, { id });
      const res = await apiFetch(url, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        throw await res.json();
      }
      return api.invoices.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.invoices.get.path, data.id] });
      toast({
        title: "Success",
        description: "Invoice updated successfully",
      });
    },
    onError: (err: any) => {
      const zimraErr = getZimraErrorMessage(err.zimraErrorCode);
      toast({
        title: zimraErr.title,
        description: err.message || zimraErr.message,
        variant: "destructive",
      });
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
        throw await res.json();
      }
      return api.invoices.fiscalize.responses[200].parse(await res.json());
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.get.path, id] });
      // Also invalidate list if we are viewing the list
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });

      // Check if there are validation errors
      if (data.validationErrors && data.validationErrors.length > 0) {
        toast({
          title: "Fiscalization Completed with Errors",
          description: `Receipt submitted but ${data.validationErrors.length} validation error(s) found. Please review and fix.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invoice Fiscalized Successfully",
          description: `Fiscal Number: ${data.fiscalCode}`,
          className: "bg-green-100 text-green-900"
        });
      }
    },
    onError: (err: any) => {
      const zimraErr = getZimraErrorMessage(err.zimraErrorCode);
      toast({
        title: zimraErr.title,
        description: err.message || zimraErr.message,
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
    // ... (useDeleteInvoice existing code)
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
    },
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiFetch(`/api/invoices/${invoiceId}/credit-note`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create credit note");
      }
      return await res.json(); // Returns the new invoice object
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      toast({
        title: "Credit Note Created",
        description: `Draft CN-${data.id} created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateDebitNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const res = await apiFetch(`/api/invoices/${invoiceId}/debit-note`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create debit note");
      }
      return await res.json(); // Returns the new invoice object
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      toast({
        title: "Debit Note Created",
        description: `Draft DN-${data.id} created successfully.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useConvertQuotation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/invoices/${id}/convert`, {
        method: "POST",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to convert quotation");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.invoices.get.path, data.id] });
      toast({
        title: "Quotation Converted",
        description: "Your quotation has been converted to a draft invoice.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Conversion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function usePayments(invoiceId: number) {
  return useQuery({
    queryKey: [api.payments.list.path, invoiceId],
    queryFn: async () => {
      const url = buildUrl(api.payments.list.path, { invoiceId });
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return api.payments.list.responses[200].parse(await res.json());
    },
    enabled: !!invoiceId,
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: number; data: any }) => {
      const url = buildUrl(api.payments.create.path, { invoiceId });
      const res = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to add payment");
      }
      return api.payments.create.responses[201].parse(await res.json());
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.payments.list.path, variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: [api.invoices.get.path, variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: [api.invoices.list.path] });
      toast({
        title: "Payment Recorded",
        description: "Payment has been successfully recorded.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
