import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Branch, type InsertBranch } from "@shared/schema";
import { apiFetch } from "@/lib/api";

export function useBranches(companyId: number) {
  return useQuery<Branch[]>({
    queryKey: ["/api/companies", companyId, "branches"],
    queryFn: async () => {
      const res = await apiFetch(`/api/companies/${companyId}/branches`);
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
    enabled: !!companyId,
  });
}

export function useCreateBranch(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertBranch) => {
      const res = await apiFetch(`/api/companies/${companyId}/branches`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create branch");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "branches"] });
    },
  });
}

export function useUpdateBranch(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<InsertBranch> & { id: number }) => {
      const res = await apiFetch(`/api/companies/${companyId}/branches/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update branch");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "branches"] });
    },
  });
}

export function useDeleteBranch(companyId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/companies/${companyId}/branches/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete branch");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies", companyId, "branches"] });
    },
  });
}
