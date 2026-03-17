
import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiFetch } from "@/lib/api";

export function useStockValuation(companyId: number) {
    return useQuery({
        queryKey: [api.reports.stockValuation.path, companyId],
        queryFn: async () => {
            const url = buildUrl(api.reports.stockValuation.path, { companyId });
            const res = await apiFetch(url);
            if (!res.ok) throw new Error("Failed to fetch stock valuation");
            return api.reports.stockValuation.responses[200].parse(await res.json());
        },
        enabled: !!companyId,
    });
}

export function useFinancialSummary(companyId: number, from?: string, to?: string, drillDown?: boolean) {
    return useQuery({
        queryKey: [api.reports.financialSummary.path, companyId, from, to, drillDown],
        queryFn: async () => {
            const url = buildUrl(api.reports.financialSummary.path, { companyId, from, to, drillDown: drillDown ? "true" : undefined });
            const res = await apiFetch(url);
            if (!res.ok) throw new Error("Failed to fetch financial summary");
            return api.reports.financialSummary.responses[200].parse(await res.json());
        },
        enabled: !!companyId,
    });
}
