import {
    getPendingSales,
    updatePendingSaleStatus,
    removePendingSale,
    getPendingShifts,
    updatePendingShiftStatus,
    removePendingShift,
    type PendingSale,
    type PendingShiftAction,
} from './offline-db';
import { apiFetch } from './api';
import { buildUrl, api } from '@shared/routes';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'complete';

export interface SyncResult {
    total: number;
    synced: number;
    failed: number;
    errors: Array<{ saleId?: string; shiftId?: string; error: string }>;
}

/**
 * Sync all pending offline shifts.
 * Shifts must be synced before sales to ensure valid shift context.
 */
export async function syncPendingShifts(companyId: number): Promise<{ success: boolean; errors: string[] }> {
    const pending = await getPendingShifts(companyId);
    const toSync = pending.filter(s => s.status === 'pending' || s.status === 'failed');

    if (toSync.length === 0) return { success: true, errors: [] };

    const errors: string[] = [];
    for (const action of toSync) {
        try {
            await updatePendingShiftStatus(action.id, 'syncing');

            let url = '';
            let body = {};

            if (action.type === 'open') {
                url = "/api/pos/shifts/open";
                body = { companyId: action.companyId, openingBalance: action.data.openingBalance };
            } else {
                url = `/api/pos/shifts/${action.data.shiftId}/close`;
                body = { closingBalance: action.data.closingBalance };
            }

            const res = await apiFetch(url, {
                method: 'POST',
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

            await removePendingShift(action.id);
        } catch (error: any) {
            const errorMsg = error.message || 'Shift sync failed';
            await updatePendingShiftStatus(action.id, 'failed');
            errors.push(errorMsg);
            if (!navigator.onLine) break;
        }
    }

    return { success: errors.length === 0, errors };
}

/**
 * Sync all pending offline sales for a given company.
 * Iterates through the queue, POSTs each to the existing invoice endpoint,
 * and updates status accordingly. Uses a sequential approach to avoid
 * race conditions with fiscalization sequence numbers.
 */
export async function syncPendingSales(
    companyId: number,
    onProgress?: (synced: number, total: number) => void
): Promise<SyncResult> {
    // 1. Sync shifts first
    const shiftResult = await syncPendingShifts(companyId);

    // 2. Sync sales
    const pending = await getPendingSales(companyId);
    const toSync = pending.filter(s => s.status === 'pending' || s.status === 'failed');

    if (toSync.length === 0) {
        return {
            total: 0,
            synced: 0,
            failed: shiftResult.errors.length,
            errors: shiftResult.errors.map(e => ({ error: e }))
        };
    }

    const result: SyncResult = {
        total: toSync.length,
        synced: 0,
        failed: 0,
        errors: shiftResult.errors.map(e => ({ error: e })),
    };

    // Process sequentially to preserve fiscal sequence ordering
    for (const sale of toSync) {
        try {
            await updatePendingSaleStatus(sale.id, 'syncing');

            // Build correct URL including companyId substitution
            const url = buildUrl(api.invoices.create.path, { companyId });
            const res = await apiFetch(url, {
                method: 'POST',
                body: JSON.stringify({
                    ...sale.invoiceData,
                    isOfflineSync: true // Mark as synced offline sale to bypass shift validation
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(err.message || `HTTP ${res.status}`);
            }

            // Sale synced successfully — remove from queue
            await removePendingSale(sale.id);
            result.synced++;
            onProgress?.(result.synced, result.total);
        } catch (error: any) {
            const errorMsg = error.message || 'Sync failed';
            await updatePendingSaleStatus(sale.id, 'failed', errorMsg);
            result.failed++;
            result.errors.push({ saleId: sale.id, error: errorMsg });
            onProgress?.(result.synced, result.total);

            // If this is a network error, stop trying — we're still offline
            if (!navigator.onLine) {
                break;
            }
        }
    }

    return result;
}
