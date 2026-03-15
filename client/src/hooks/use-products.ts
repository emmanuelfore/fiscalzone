import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertProduct } from "@shared/schema";
import { apiFetch } from "@/lib/api";
import { cacheProducts, getCachedProducts, setLastCacheTime } from "@/lib/offline-db";

export function useProducts(companyId: number) {
  return useQuery({
    queryKey: [api.products.list.path, companyId],
    queryFn: async () => {
      try {
        const url = buildUrl(api.products.list.path, { companyId });
        const res = await apiFetch(url);
        if (!res.ok) throw new Error("Failed to fetch products");
        const products = api.products.list.responses[200].parse(await res.json());
        if (companyId) {
          await cacheProducts(companyId, products);
          // Update the cache timestamp so the 24h stale warning resets
          await setLastCacheTime(companyId, Date.now());
        }
        return products;
      } catch (err) {
        console.warn("Products fetch failed, trying offline cache...", err);
        const cached = await getCachedProducts(companyId);
        if (cached && cached.length > 0) return cached;
        throw err;
      }
    },
    enabled: !!companyId,
  });
}

export function useCreateProduct(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<InsertProduct, "companyId">) => {
      const url = buildUrl(api.products.create.path, { companyId });
      const res = await apiFetch(url, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create product");
      return api.products.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.products.list.path, companyId] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProduct> }) => {
      const url = buildUrl(api.products.update.path, { id });
      const res = await apiFetch(url, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update product");
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate all product lists
      // Note: better to invalidate specific company list if we had the ID, but this works
      queryClient.invalidateQueries({ queryKey: [api.products.list.path] });
    },
  });
}
