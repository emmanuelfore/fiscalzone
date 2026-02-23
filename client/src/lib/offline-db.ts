import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'pos-offline';
const DB_VERSION = 2;

interface PendingSale {
    id: string;
    companyId: number;
    invoiceData: any;
    createdAt: string;
    status: 'pending' | 'syncing' | 'failed';
    error?: string;
    attempts: number;
}

interface PendingShiftAction {
    id: string;
    companyId: number;
    type: 'open' | 'close';
    data: any;
    status: 'pending' | 'syncing' | 'failed';
    createdAt: string;
}

interface OfflineHold {
    id: string;
    companyId: number;
    cartData: any;
    customerId: string;
    holdName: string;
    createdAt: string;
}

let dbInstance: IDBPDatabase | null = null;

export async function getDb(): Promise<IDBPDatabase> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            // Reference data stores — keyed by companyId
            if (!db.objectStoreNames.contains('products')) {
                db.createObjectStore('products');
            }
            if (!db.objectStoreNames.contains('customers')) {
                db.createObjectStore('customers');
            }
            if (!db.objectStoreNames.contains('currencies')) {
                db.createObjectStore('currencies');
            }
            if (!db.objectStoreNames.contains('taxConfig')) {
                db.createObjectStore('taxConfig');
            }
            if (!db.objectStoreNames.contains('companySettings')) {
                db.createObjectStore('companySettings');
            }

            // Shifts cache
            if (!db.objectStoreNames.contains('shifts')) {
                db.createObjectStore('shifts');
            }

            // Pending sales queue — keyed by unique id
            if (!db.objectStoreNames.contains('pendingSales')) {
                const store = db.createObjectStore('pendingSales', { keyPath: 'id' });
                store.createIndex('byCompany', 'companyId');
                store.createIndex('byStatus', 'status');
            }

            // Pending shifts queue
            if (!db.objectStoreNames.contains('pendingShifts')) {
                const store = db.createObjectStore('pendingShifts', { keyPath: 'id' });
                store.createIndex('byCompany', 'companyId');
                store.createIndex('byStatus', 'status');
            }

            // Holds store
            if (!db.objectStoreNames.contains('holds')) {
                const store = db.createObjectStore('holds', { keyPath: 'id' });
                store.createIndex('byCompany', 'companyId');
            }

            // Metadata store
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata');
            }
        },
    });

    return dbInstance;
}

// ─── Metadata ───────────────────────────────────────────────────────────────

export async function setLastCacheTime(companyId: number, timestamp: number): Promise<void> {
    const db = await getDb();
    await db.put('metadata', timestamp, `lastCache-${companyId}`);
}

export async function getLastCacheTime(companyId: number): Promise<number | undefined> {
    const db = await getDb();
    return db.get('metadata', `lastCache-${companyId}`);
}

// ─── Products ───────────────────────────────────────────────────────────────

export async function cacheProducts(companyId: number, products: any[]): Promise<void> {
    const db = await getDb();
    await db.put('products', products, companyId);
}

export async function getCachedProducts(companyId: number): Promise<any[] | undefined> {
    const db = await getDb();
    return db.get('products', companyId);
}

// ─── Customers ──────────────────────────────────────────────────────────────

export async function cacheCustomers(companyId: number, customers: any[]): Promise<void> {
    const db = await getDb();
    await db.put('customers', customers, companyId);
}

export async function getCachedCustomers(companyId: number): Promise<any[] | undefined> {
    const db = await getDb();
    return db.get('customers', companyId);
}

// ─── Currencies ─────────────────────────────────────────────────────────────

export async function cacheCurrencies(companyId: number, currencies: any[]): Promise<void> {
    const db = await getDb();
    await db.put('currencies', currencies, companyId);
}

export async function getCachedCurrencies(companyId: number): Promise<any[] | undefined> {
    const db = await getDb();
    return db.get('currencies', companyId);
}

// ─── Tax Config ─────────────────────────────────────────────────────────────

export async function cacheTaxConfig(companyId: number, taxConfig: any): Promise<void> {
    const db = await getDb();
    await db.put('taxConfig', taxConfig, companyId);
}

export async function getCachedTaxConfig(companyId: number): Promise<any | undefined> {
    const db = await getDb();
    return db.get('taxConfig', companyId);
}

// ─── Company Settings ───────────────────────────────────────────────────────

export async function cacheCompanySettings(companyId: number, company: any): Promise<void> {
    const db = await getDb();
    await db.put('companySettings', company, companyId);
}

export async function getCachedCompanySettings(companyId: number): Promise<any | undefined> {
    const db = await getDb();
    return db.get('companySettings', companyId);
}

// ─── Shifts ─────────────────────────────────────────────────────────────────

export async function cacheShift(companyId: number, shift: any): Promise<void> {
    const db = await getDb();
    await db.put('shifts', shift, companyId);
}

export async function getCachedShift(companyId: number): Promise<any | undefined> {
    const db = await getDb();
    return db.get('shifts', companyId);
}

// ─── Pending Shifts ─────────────────────────────────────────────────────────

export async function addPendingShiftAction(companyId: number, type: 'open' | 'close', data: any): Promise<string> {
    const db = await getDb();
    const id = `shift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const action: PendingShiftAction = {
        id,
        companyId,
        type,
        data,
        status: 'pending',
        createdAt: new Date().toISOString(),
    };
    await db.put('pendingShifts', action);
    return id;
}

export async function getPendingShifts(companyId: number): Promise<PendingShiftAction[]> {
    const db = await getDb();
    return db.getAllFromIndex('pendingShifts', 'byCompany', companyId);
}

export async function updatePendingShiftStatus(id: string, status: PendingShiftAction['status']): Promise<void> {
    const db = await getDb();
    const action = await db.get('pendingShifts', id);
    if (action) {
        action.status = status;
        await db.put('pendingShifts', action);
    }
}

export async function removePendingShift(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('pendingShifts', id);
}

// ─── Holds ──────────────────────────────────────────────────────────────────

export async function addOfflineHold(companyId: number, cartData: any, customerId: string, holdName: string): Promise<string> {
    const db = await getDb();
    const id = `hold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const hold: OfflineHold = {
        id,
        companyId,
        cartData,
        customerId,
        holdName,
        createdAt: new Date().toISOString(),
    };
    await db.put('holds', hold);
    return id;
}

export async function getOfflineHolds(companyId: number): Promise<OfflineHold[]> {
    const db = await getDb();
    return db.getAllFromIndex('holds', 'byCompany', companyId);
}

export async function removeOfflineHold(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('holds', id);
}

// ─── Pending Sales ──────────────────────────────────────────────────────────

export async function addPendingSale(companyId: number, invoiceData: any): Promise<string> {
    const db = await getDb();
    const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sale: PendingSale = {
        id,
        companyId,
        invoiceData,
        createdAt: new Date().toISOString(),
        status: 'pending',
        attempts: 0,
    };
    await db.put('pendingSales', sale);
    return id;
}

export async function getPendingSales(companyId: number): Promise<PendingSale[]> {
    const db = await getDb();
    const all = await db.getAllFromIndex('pendingSales', 'byCompany', companyId);
    return all;
}

export async function getAllPendingSalesByStatus(status: PendingSale['status']): Promise<PendingSale[]> {
    const db = await getDb();
    return db.getAllFromIndex('pendingSales', 'byStatus', status);
}

export async function updatePendingSaleStatus(
    id: string,
    status: PendingSale['status'],
    error?: string
): Promise<void> {
    const db = await getDb();
    const sale = await db.get('pendingSales', id);
    if (sale) {
        sale.status = status;
        sale.attempts = (sale.attempts || 0) + 1;
        if (error) sale.error = error;
        await db.put('pendingSales', sale);
    }
}

export async function removePendingSale(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('pendingSales', id);
}

export async function getPendingSalesCount(companyId: number): Promise<number> {
    const sales = await getPendingSales(companyId);
    return sales.filter(s => s.status === 'pending' || s.status === 'failed').length;
}

export async function getPendingShiftsCount(companyId: number): Promise<number> {
    const shifts = await getPendingShifts(companyId);
    return shifts.filter(s => s.status === 'pending' || s.status === 'failed').length;
}

export type { PendingSale, PendingShiftAction, OfflineHold };
