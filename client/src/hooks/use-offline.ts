import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingSalesCount, getPendingShiftsCount, getLastCacheTime } from '@/lib/offline-db';
import { syncPendingSales, type SyncStatus, type SyncResult } from '@/lib/offline-sync';
import { useToast } from '@/hooks/use-toast';
import { useIsOnline } from '@/hooks/use-is-online';

interface UseOfflineReturn {
    isOnline: boolean;
    pendingSalesCount: number;
    syncStatus: SyncStatus;
    syncProgress: { synced: number; total: number };
    lastSyncResult: SyncResult | null;
    triggerSync: () => Promise<void>;
    refreshPendingCount: () => Promise<void>;
    lastCacheTime: number | null;
    refreshCacheTime: () => Promise<void>;
}

export function useOffline(companyId: number): UseOfflineReturn {
    const isOnline = useIsOnline();
    const [pendingSalesCount, setPendingSalesCount] = useState(0);
    const [pendingShiftsCount, setPendingShiftsCount] = useState(0);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });
    const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
    const [lastCacheTime, setLastCacheTimeState] = useState<number | null>(null);
    const isSyncingRef = useRef(false);
    const { toast } = useToast();

    const refreshPendingCount = useCallback(async () => {
        if (!companyId) return;
        try {
            const [salesCount, shiftsCount] = await Promise.all([
                getPendingSalesCount(companyId),
                getPendingShiftsCount(companyId)
            ]);
            setPendingSalesCount(salesCount);
            setPendingShiftsCount(shiftsCount);
        } catch (e) {
            console.error('Failed to get pending counts:', e);
        }
    }, [companyId]);

    const refreshCacheTime = useCallback(async () => {
        if (!companyId) return;
        try {
            const time = await getLastCacheTime(companyId);
            console.log(`[useOffline] company:${companyId} lastCacheTime:`, time ? new Date(time).toLocaleString() : 'null');
            if (time) setLastCacheTimeState(time);
        } catch (e) {
            console.error('Failed to get cache time:', e);
        }
    }, [companyId]);

    useEffect(() => {
        refreshPendingCount();
        refreshCacheTime();
        const interval = setInterval(() => {
            refreshPendingCount();
            refreshCacheTime();
        }, 10000);
        return () => clearInterval(interval);
    }, [refreshPendingCount, refreshCacheTime]);

    const triggerSync = useCallback(async () => {
        if (!companyId || isSyncingRef.current || !navigator.onLine) return;

        isSyncingRef.current = true;
        setSyncStatus('syncing');

        try {
            const result = await syncPendingSales(companyId, (synced, total) => {
                setSyncProgress({ synced, total });
            });

            setLastSyncResult(result);

            if (result.synced > 0) {
                toast({
                    title: '✅ Offline Sales Synced',
                    description: `${result.synced} of ${result.total} sale(s) synced successfully.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
                });
            }

            setSyncStatus(result.failed > 0 ? 'error' : 'complete');
            await refreshPendingCount();
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (error) {
            console.error('Sync failed:', error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
        } finally {
            isSyncingRef.current = false;
        }
    }, [companyId, toast, refreshPendingCount]);

    useEffect(() => {
        if (isOnline && (pendingSalesCount > 0 || pendingShiftsCount > 0)) {
            const timer = setTimeout(() => triggerSync(), 2000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, pendingSalesCount, pendingShiftsCount, triggerSync]);

    return {
        isOnline,
        pendingSalesCount,
        syncStatus,
        syncProgress,
        lastSyncResult,
        triggerSync,
        refreshPendingCount,
        lastCacheTime,
        refreshCacheTime,
    };
}