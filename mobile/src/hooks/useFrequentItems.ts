/**
 * useFrequentItems.ts
 * Tracks which products are added to cart most often and surfaces top picks.
 */
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FREQ_KEY = "@pos_frequent_items";
const TOP_N = 8;

interface FreqRecord {
  [productId: number]: { count: number; name: string; price: number; category?: string };
}

export function useFrequentItems(companyId: number | null) {
  const storageKey = `${FREQ_KEY}_${companyId}`;
  const [frequent, setFrequent] = useState<FreqRecord[keyof FreqRecord][]>([]);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) return;
      const record: FreqRecord = JSON.parse(raw);
      const sorted = Object.entries(record)
        .map(([id, data]) => ({ productId: Number(id), ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_N);
      setFrequent(sorted as any);
    } catch { /* ignore */ }
  }, [storageKey]);

  useEffect(() => { load(); }, [load]);

  const recordAdd = useCallback(async (item: { productId: number; name: string; price: number; category?: string }) => {
    try {
      const raw = await AsyncStorage.getItem(storageKey);
      const record: FreqRecord = raw ? JSON.parse(raw) : {};
      const existing = record[item.productId];
      record[item.productId] = {
        count: (existing?.count ?? 0) + 1,
        name: item.name,
        price: item.price,
        category: item.category,
      };
      await AsyncStorage.setItem(storageKey, JSON.stringify(record));
      // Refresh the list
      const sorted = Object.entries(record)
        .map(([id, data]) => ({ productId: Number(id), ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_N);
      setFrequent(sorted as any);
    } catch { /* ignore */ }
  }, [storageKey]);

  return { frequent, recordAdd, reload: load };
}
