import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertProduct } from "@shared/schema";
import { apiFetch } from "@/lib/api";
import { cacheProducts, getCachedProducts, setLastCacheTime } from "@/lib/offline-db";
import { getIsOnline } from "@/lib/online-state";

export function useProducts(companyId: number) {
  return useQuery({
    queryKey: [api.products.list.path, companyId],
    queryFn: async () => {
      // Always try cache first when offline
      if (!getIsOnline()) {
        const cached = await getCachedProducts(companyId);
        console.log(`[useProducts] offline, cached count: ${cached?.length ?? 0}`);
        return cached && cached.length > 0 ? cached : [];
      }
      // Online path — try API, fall back to cache on any failure or 401
      try {
        const url = buildUrl(api.products.list.path, { companyId });
        const res = await apiFetch(url);
        if (res.status === 401) {
          console.warn('[useProducts] 401 — using cached products');
          const cached = await getCachedProducts(companyId);
          console.log(`[useProducts] cache fallback count: ${cached?.length ?? 0}`);
          return cached ?? [];
        }
        if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
        const products = api.products.list.responses[200].parse(await res.json());
        if (companyId) {
          await cacheProducts(companyId, products);
          await setLastCacheTime(companyId, Date.now());
        }
        return products;
      } catch (err) {
        console.warn('[useProducts] fetch error, falling back to cache:', err);
        const cached = await getCachedProducts(companyId);
        console.log(`[useProducts] error cache fallback count: ${cached?.length ?? 0}`);
        return cached ?? [];
      }
    },
    enabled: !!companyId,
    retry: false,
    staleTime: 0, // always re-run on mount so cache is loaded fresh
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
