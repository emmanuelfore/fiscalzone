import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch, apiJson } from "../lib/api";

// ── Module-level in-memory cache (instant on re-mounts) ──────────────────────
const memCache: Record<string, any> = {};

const CACHE_KEYS = {
  products: (companyId: number) => `pos:cache:products:${companyId}`,
  customers: (companyId: number) => `pos:cache:customers:${companyId}`,
  suppliers: (companyId: number) => `pos:cache:suppliers:${companyId}`,
  currencies: (companyId: number) => `pos:cache:currencies:${companyId}`,
  company: (companyId: number) => `pos:cache:company:${companyId}`,
} as const;

export function useProducts(companyId: number | null) {
  const key = CACHE_KEYS.products(companyId || 0);
  const [data, setData] = useState<any[] | null>(() => memCache[key] ?? null);
  const [isLoading, setLoading] = useState(!memCache[key]);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(!!memCache[key]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    const load = async () => {
      // If already in memory, skip the loading state
      if (memCache[key]) {
        setData(memCache[key]);
        setFromCache(true);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // 1. Load from AsyncStorage if not in memory already
      if (!memCache[key]) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached && !cancelled) {
            const parsed = JSON.parse(cached);
            memCache[key] = parsed;
            setData(parsed);
            setFromCache(true);
            setLoading(false);
          }
        } catch (e) {
          console.warn("[Cache] Failed to load products:", e);
        }
      }

      // 2. Fetch from network in background
      try {
        const res = await apiJson<any[]>(`/api/companies/${companyId}/products`);
        if (!cancelled) {
          memCache[key] = res;
          setData(res);
          setFromCache(false);
          await AsyncStorage.setItem(key, JSON.stringify(res));
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to refresh products");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [companyId]);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await apiJson<any[]>(`/api/companies/${companyId}/products`);
      memCache[key] = res;
      setData(res);
      setFromCache(false);
      await AsyncStorage.setItem(key, JSON.stringify(res));
    } catch (e: any) {
      setError(e?.message ?? "Failed to refresh products");
    } finally {
      setLoading(false);
    }
  };

  return { data, isLoading, error, fromCache, refresh };
}

export function useCustomers(companyId: number | null) {
  const key = CACHE_KEYS.customers(companyId || 0);
  const [data, setData] = useState<any[] | null>(() => memCache[key] ?? null);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(!!memCache[key]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    const load = async () => {
      setError(null);
      
      if (!memCache[key]) {
        try {
          const cached = await AsyncStorage.getItem(key);
          if (cached && !cancelled) {
            const parsed = JSON.parse(cached);
            memCache[key] = parsed;
            setData(parsed);
            setFromCache(true);
          }
        } catch (e) {
          console.warn("[Cache] Failed to load customers:", e);
        }
      }

      try {
        const res = await apiJson<any[]>(`/api/companies/${companyId}/customers`);
        if (!cancelled) {
          memCache[key] = res;
          setData(res);
          setFromCache(false);
          await AsyncStorage.setItem(key, JSON.stringify(res));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to refresh customers");
      }
    };

    load();
    return () => { cancelled = true; };
  }, [companyId]);

  const refresh = async () => {
    try {
      const res = await apiJson<any[]>(`/api/companies/${companyId}/customers`);
      memCache[key] = res;
      setData(res);
      setFromCache(false);
      await AsyncStorage.setItem(key, JSON.stringify(res));
    } catch (e: any) {
      setError(e?.message ?? "Failed to refresh customers");
    }
  };

  return { data, error, fromCache, refresh };
}

export function useSuppliers(companyId: number | null) {
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const key = CACHE_KEYS.suppliers(companyId || 0);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const cached = await AsyncStorage.getItem(key);
        if (cached && !cancelled) {
          setData(JSON.parse(cached));
          setFromCache(true);
          setLoading(false);
        }

        const res = await apiJson<any[]>(`/api/companies/${companyId}/suppliers`);
        if (!cancelled) {
          setData(res);
          setFromCache(false);
          await AsyncStorage.setItem(key, JSON.stringify(res));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load suppliers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [companyId]);

  const refresh = async () => {
    try {
      setLoading(true);
      const res = await apiJson<any[]>(`/api/companies/${companyId}/suppliers`);
      setData(res);
      setFromCache(false);
      await AsyncStorage.setItem(key, JSON.stringify(res));
    } catch (e: any) {
      setError(e?.message ?? "Failed to refresh suppliers");
    } finally {
      setLoading(false);
    }
  };

  return { data, isLoading, error, fromCache, refresh };
}

export function useCompany(companyId: number | null) {
  const key = `pos:cache:company:${companyId || 0}`;
  const [data, setData] = useState<any | null>(() => memCache[key] ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setError(null);

    // Serve from memory cache immediately if available
    if (memCache[key]) {
      setData(memCache[key]);
      // Still refresh in background so data stays fresh
    } else {
      // Try disk cache first for instant startup
      AsyncStorage.getItem(key).then((cached) => {
        if (cached && !cancelled) {
          try {
            const parsed = JSON.parse(cached);
            memCache[key] = parsed;
            setData(parsed);
          } catch { /* ignore corrupt cache */ }
        }
      }).catch(() => {});
    }

    // Always refresh from network in background
    apiJson<any>(`/api/companies/${companyId}`)
      .then((res) => {
        if (!cancelled) {
          memCache[key] = res;
          setData(res);
          AsyncStorage.setItem(key, JSON.stringify(res)).catch(() => {});
        }
      })
      .catch((e: any) => !cancelled && setError(e?.message ?? "Failed to load company"));

    return () => { cancelled = true; };
  }, [companyId]);

  return { data, error };
}


export function useCurrencies(companyId: number | null) {
  const key = CACHE_KEYS.currencies(companyId || 0);
  const [data, setData] = useState<any[] | null>(() => memCache[key] ?? null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setError(null);

    if (memCache[key]) return; // already have data

    apiJson<any[]>(`/api/companies/${companyId}/currencies`)
      .then((res) => {
        if (!cancelled) {
          memCache[key] = res;
          setData(res);
        }
      })
      .catch((e: any) => !cancelled && setError(e?.message ?? "Failed to load currencies"));
    return () => { cancelled = true; };
  }, [companyId]);

  return { data, error };
}

export function useTaxTypes(companyId: number | null) {
  const [data, setData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setError(null);
    apiJson<any[]>(`/api/tax/types?companyId=${companyId}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e: any) => !cancelled && setError(e?.message ?? "Failed to load tax types"));
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { data, error };
}

export function useCreateInvoice(companyId: number | null) {
  const create = async (payload: any) => {
    if (!companyId) {
      throw new Error("Missing companyId");
    }
    const res = await apiFetch(`/api/companies/${companyId}/invoices`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Failed to create invoice");
    }
    return res.json();
  };
  return { create };
}

export function usePosSales(companyId: number | null, startDate: Date, endDate: Date) {
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    const fetchSales = async () => {
      setLoading(true);
      setError(null);
      try {
        const start = startDate.toISOString();
        const end = endDate.toISOString();
        const res = await apiJson<any[]>(`/api/pos/all-sales?companyId=${companyId}&startDate=${start}&endDate=${end}`);
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load sales");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchSales();
    return () => { cancelled = true; };
  }, [companyId, startDate.toISOString(), endDate.toISOString()]);

  return { data, isLoading, error };
}

export function useInvoiceItems(invoiceId: number | null) {
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setData(null);
      return;
    }
    let cancelled = false;
    const fetchItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiJson<any>(`/api/invoices/${invoiceId}`);
        if (!cancelled) setData(res.items || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load items");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchItems();
    return () => { cancelled = true; };
  }, [invoiceId]);

  return { data, isLoading, error };
}

