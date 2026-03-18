import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCustomer } from "@shared/schema";
import { apiFetch } from "@/lib/api";
import { cacheCustomers, getCachedCustomers } from "@/lib/offline-db";
import { getIsOnline } from "@/lib/online-state";

export function useCustomers(companyId: number) {
  return useQuery({
    queryKey: [api.customers.list.path, companyId],
    queryFn: async () => {
      if (!getIsOnline()) {
        const cached = await getCachedCustomers(companyId);
        return cached ?? [];
      }
      try {
        const url = buildUrl(api.customers.list.path, { companyId });
        const res = await apiFetch(url);
        if (res.status === 401) {
          const cached = await getCachedCustomers(companyId);
          return cached ?? [];
        }
        if (!res.ok) throw new Error("Failed to fetch customers");
        const customers = api.customers.list.responses[200].parse(await res.json());
        if (companyId) await cacheCustomers(companyId, customers);
        return customers;
      } catch (err) {
        console.warn("Customers fetch failed, trying offline cache...", err);
        const cached = await getCachedCustomers(companyId);
        return cached ?? [];
      }
    },
    enabled: !!companyId,
    retry: false,
    staleTime: 0,
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

export function useCustomerStatement(customerId: number, startDate: Date, endDate: Date, currency?: string) {
  return useQuery({
    queryKey: [`/api/customers/${customerId}/statement`, startDate.toISOString(), endDate.toISOString(), currency],
    queryFn: async () => {
      const startStr = startDate.toISOString();
      const endStr = endDate.toISOString();
      let url = `/api/customers/${customerId}/statement?startDate=${startStr}&endDate=${endStr}`;
      if (currency) url += `&currency=${currency}`;

      const res = await apiFetch(url);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to fetch statement");
      }
      return await res.json();
    },
    enabled: !!customerId,
  });
}
