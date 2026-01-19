import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCustomer } from "@shared/schema";
import { apiFetch } from "@/lib/api";

export function useCustomers(companyId: number) {
  return useQuery({
    queryKey: [api.customers.list.path, companyId],
    queryFn: async () => {
      const url = buildUrl(api.customers.list.path, { companyId });
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch customers");
      return api.customers.list.responses[200].parse(await res.json());
    },
    enabled: !!companyId,
  });
}

export function useCreateCustomer(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertCustomer, "companyId">) => {
      const url = buildUrl(api.customers.create.path, { companyId });
      const res = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create customer");
      return api.customers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path, companyId] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCustomer> }) => {
      const url = buildUrl(api.customers.update.path, { id });
      const res = await apiFetch(url, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update customer");
      return api.customers.update.responses[200].parse(await res.json());
    },
    onSuccess: (updatedCustomer) => {
      // Invalidate the specific company customer list if possible, but we don't have companyId easily here unless passed.
      // However, usually we can just invalidate all customer lists or rely on query key refetch.
      // Better: invalidate all queries starting with customers path prefix or pass companyId.
      // Since `useCustomers` uses `[api.customers.list.path, companyId]`, we might need to invalidate widely or pass companyId.
      // Let's rely on standard invalidation or just invalidate generic key if we can't get companyId.
      queryClient.invalidateQueries({ queryKey: [api.customers.list.path] });
    },
  });
}
