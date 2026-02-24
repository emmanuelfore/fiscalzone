import { useState, useEffect, useCallback, useRef } from 'react';
import { getPendingSalesCount, getPendingShiftsCount, getLastCacheTime } from '@/lib/offline-db';
import { syncPendingSales, type SyncStatus, type SyncResult } from '@/lib/offline-sync';
import { useToast } from '@/hooks/use-toast';

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
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingSalesCount, setPendingSalesCount] = useState(0);
    const [pendingShiftsCount, setPendingShiftsCount] = useState(0);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
    const [syncProgress, setSyncProgress] = useState({ synced: 0, total: 0 });
    const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
    const [lastCacheTime, setLastCacheTimeState] = useState<number | null>(null);
    const isSyncingRef = useRef(false);
    const { toast } = useToast();

    // Unified Connectivity Probing
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const checkConnection = async () => {
            if (!navigator.onLine) {
                setIsOnline(false);
                return;
            }

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 3000);

                const response = await fetch(`/api/health?_t=${Date.now()}`, {
                    method: 'GET',
                    cache: 'no-store',
                    signal: controller.signal
                }).catch(() => null);

                clearTimeout(timeoutId);

                if (response && response.ok && response.status !== 503) {
                    setIsOnline(true);
                } else {
                    setIsOnline(false);
                }
            } catch (err) {
                setIsOnline(false);
            }
        };

        const interval = setInterval(checkConnection, 5000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    // Refresh pending count
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

    // Refresh cache time
    const refreshCacheTime = useCallback(async () => {
        if (!companyId) return;
        try {
            const time = await getLastCacheTime(companyId);
            if (time) setLastCacheTimeState(time);
        } catch (e) {
            console.error('Failed to get cache time:', e);
        }
    }, [companyId]);

    // Periodic pending count refresh
    useEffect(() => {
        refreshPendingCount();
        refreshCacheTime();
        const interval = setInterval(() => {
            refreshPendingCount();
            refreshCacheTime();
        }, 10000); // every 10s
        return () => clearInterval(interval);
    }, [refreshPendingCount, refreshCacheTime]);

    // Sync function
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

            // Reset to idle after a short delay
            setTimeout(() => setSyncStatus('idle'), 3000);
        } catch (error) {
            console.error('Sync failed:', error);
            setSyncStatus('error');
            setTimeout(() => setSyncStatus('idle'), 5000);
        } finally {
            isSyncingRef.current = false;
        }
    }, [companyId, toast, refreshPendingCount]);

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline && (pendingSalesCount > 0 || pendingShiftsCount > 0)) {
            // Small delay to let the connection stabilize
            const timer = setTimeout(() => {
                triggerSync();
            }, 2000);
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
