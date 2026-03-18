import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertCompany, type Company } from "@shared/schema";
import { apiFetch } from "@/lib/api";
import { cacheCompaniesList, getCachedCompaniesList, cacheCompanySettings, getCachedCompanySettings } from "@/lib/offline-db";
import { getIsOnline } from "@/lib/online-state";

export function useCompanies(enabled: boolean = true) {
  return useQuery({
    queryKey: [api.companies.list.path],
    queryFn: async () => {
      if (!getIsOnline()) {
        const cached = await getCachedCompaniesList();
        if (cached && cached.length > 0) return cached;
        return [];
      }
      try {
        const res = await apiFetch(api.companies.list.path);
        if (res.status === 401) {
          const cached = await getCachedCompaniesList();
          return cached && cached.length > 0 ? cached : [];
        }
        if (!res.ok) throw new Error("Failed to fetch companies");
        const companies = api.companies.list.responses[200].parse(await res.json());
        if (companies) await cacheCompaniesList(companies);
        return companies;
      } catch (err) {
        console.warn("Companies fetch failed, trying offline cache...", err);
        const cached = await getCachedCompaniesList();
        return cached && cached.length > 0 ? cached : [];
      }
    },
    enabled,
    retry: false,
  });
}

export function useCompany(id: number) {
  return useQuery({
    queryKey: [api.companies.get.path, id],
    queryFn: async () => {
      if (!getIsOnline()) {
        const cached = await getCachedCompanySettings(id);
        if (cached) return cached;
        const list = await getCachedCompaniesList();
        return list?.find((c: any) => c.id === id) ?? null;
      }
      try {
        const url = buildUrl(api.companies.get.path, { id });
        const res = await apiFetch(url);
        if (res.status === 401) {
          const cached = await getCachedCompanySettings(id);
          if (cached) return cached;
          const list = await getCachedCompaniesList();
          return list?.find((c: any) => c.id === id) ?? null;
        }
        if (!res.ok) throw new Error("Failed to fetch company");
        const company = api.companies.get.responses[200].parse(await res.json());
        if (id) await cacheCompanySettings(id, company);
        return company;
      } catch (err) {
        console.warn("Company fetch failed, trying offline cache...", err);
        const cached = await getCachedCompanySettings(id);
        if (cached) return cached;
        const list = await getCachedCompaniesList();
        return list?.find((c: any) => c.id === id) ?? null;
      }
    },
    enabled: !!id,
    retry: false,
    staleTime: 0,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCompany) => {
      const res = await apiFetch(api.companies.create.path, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create company");
      }
      return api.companies.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.companies.list.path] });
    },
  });
}

export function useUpdateCompany(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<InsertCompany>) => {
      const res = await apiFetch(`/api/companies/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update company");
      }
      return await res.json() as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.companies.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.companies.get.path, id] });
    },
  });
}

