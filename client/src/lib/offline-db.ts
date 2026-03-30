import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'pos-offline';
const DB_VERSION = 6;

interface PendingSale {
    id: string;
    companyId: number;
    branchId?: number | null;
    invoiceData: any;
    createdAt: string;
    status: 'pending' | 'syncing' | 'failed';
    error?: string;
    attempts: number;
}

interface PendingShiftAction {
    id: string;
    companyId: number;
    branchId?: number | null;
    type: 'open' | 'close';
    data: any;
    status: 'pending' | 'syncing' | 'failed';
    createdAt: string;
}

interface OfflineHold {
    id: string;
    companyId: number;
    branchId?: number | null;
    cartData: any;
    customerId: string;
    holdName: string;
    createdAt: string;
}

let dbInstance: IDBPDatabase | null = null;

export async function getDb(): Promise<IDBPDatabase> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion) {
            console.log(`[DB] Upgrading from ${oldVersion} to ${newVersion}`);

            const stores = [
                'products', 'customers', 'currencies', 'taxConfig',
                'companySettings', 'shifts', 'metadata', 'user_cache',
                'companies_list'
            ];

            stores.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            });

            // Pending sales queue
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

            // Offline Credentials
            if (!db.objectStoreNames.contains('offline_credentials')) {
                db.createObjectStore('offline_credentials', { keyPath: 'email' });
            }
        },
        blocked() {
            console.warn('[DB] Upgrade blocked by older version open in another tab. Please close all tabs.');
        },
        blocking() {
            console.warn('[DB] New version available, closing this connection to allow upgrade.');
            dbInstance?.close();
            dbInstance = null;
        }
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

// ─── User Cache ─────────────────────────────────────────────────────────────

export async function cacheUser(user: any): Promise<void> {
    const db = await getDb();
    await db.put('user_cache', user, 'current_user');
}

export async function getCachedUser(): Promise<any | undefined> {
    const db = await getDb();
    return db.get('user_cache', 'current_user');
}

export async function clearCachedUser(): Promise<void> {
    const db = await getDb();
    await db.delete('user_cache', 'current_user');
    // Note: We intentionally do NOT clear 'offline_credentials' or 'companies_list' here.
    // This allows cashiers to log back into the POS terminal even if
    // the internet drops after they've explicitly logged out, and ensures
    // selectedCompanyId can be restored on next offline login.
}

// ─── Offline Credentials ────────────────────────────────────────────────────

// Simple hashing for local offline verification. NOT meant for production backend storage,
// but sufficient for preventing plain-text storage of local caching.
async function hashPassword(password: string, salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function saveOfflineCredentials(email: string, password: string, user: any): Promise<void> {
    const db = await getDb();
    const salt = crypto.randomUUID();
    const hash = await hashPassword(password, salt);
    
    await db.put('offline_credentials', {
        email: email.toLowerCase(),
        hash,
        salt,
        user,
        lastOnlineLogin: new Date().toISOString()
    });
}

export async function verifyOfflineCredentials(email: string, password: string): Promise<any | null> {
    const db = await getDb();
    const record = await db.get('offline_credentials', email.toLowerCase());
    
    if (!record) return null;
    
    const computedHash = await hashPassword(password, record.salt);
    if (computedHash === record.hash) {
        return record.user;
    }
    
    return null;
}

// ─── Companies List ──────────────────────────────────────────────────────────

export async function cacheCompaniesList(companies: any[]): Promise<void> {
    const db = await getDb();
    await db.put('companies_list', companies, 'current_list');
}

export async function getCachedCompaniesList(): Promise<any[] | undefined> {
    const db = await getDb();
    return db.get('companies_list', 'current_list');
}

// ─── Products ───────────────────────────────────────────────────────────────

export async function cacheProducts(companyId: number, products: any[]): Promise<void> {
    const db = await getDb();
    await db.put('products', products, companyId);
}

export async function getCachedProducts(companyId: number): Promise<any[] | undefined> {
    const db = await getDb();
    // Try numeric key first, then string key (handles legacy data stored with string companyId)
    const result = await db.get('products', companyId);
    if (result) return result;
    return db.get('products', String(companyId));
}

// ─── Customers ──────────────────────────────────────────────────────────────

export async function cacheCustomers(companyId: number, customers: any[]): Promise<void> {
    const db = await getDb();
    await db.put('customers', customers, companyId);
}

export async function getCachedCustomers(companyId: number): Promise<any[] | undefined> {
    const db = await getDb();
    const result = await db.get('customers', companyId);
    if (result) return result;
    return db.get('customers', String(companyId));
}

// ─── Currencies ─────────────────────────────────────────────────────────────

export async function cacheCurrencies(companyId: number, currencies: any[]): Promise<void> {
    const db = await getDb();
    await db.put('currencies', currencies, companyId);
}

export async function getCachedCurrencies(companyId: number): Promise<any[] | undefined> {
    const db = await getDb();
    const result = await db.get('currencies', companyId);
    if (result) return result;
    return db.get('currencies', String(companyId));
}

// ─── Tax Config ─────────────────────────────────────────────────────────────

export async function cacheTaxConfig(companyId: number, taxConfig: any): Promise<void> {
    const db = await getDb();
    await db.put('taxConfig', taxConfig, companyId);
}

export async function getCachedTaxConfig(companyId: number): Promise<any | undefined> {
    const db = await getDb();
    const result = await db.get('taxConfig', companyId);
    if (result) return result;
    return db.get('taxConfig', String(companyId));
}

// ─── Company Settings ───────────────────────────────────────────────────────

export async function cacheCompanySettings(companyId: number, company: any): Promise<void> {
    const db = await getDb();
    await db.put('companySettings', company, companyId);
}

export async function getCachedCompanySettings(companyId: number): Promise<any | undefined> {
    const db = await getDb();
    const result = await db.get('companySettings', companyId);
    if (result) return result;
    return db.get('companySettings', String(companyId));
}

// ─── Shifts ─────────────────────────────────────────────────────────────────

export async function cacheShift(companyId: number, shift: any): Promise<void> {
    const db = await getDb();
    await db.put('shifts', shift, companyId);
}

export async function getCachedShift(companyId: number): Promise<any | undefined> {
    const db = await getDb();
    const result = await db.get('shifts', companyId);
    if (result) return result;
    return db.get('shifts', String(companyId));
}

// ─── Pending Shifts ─────────────────────────────────────────────────────────

export async function addPendingShiftAction(companyId: number, type: 'open' | 'close', data: any, branchId?: number | null): Promise<string> {
    const db = await getDb();
    const id = `shift-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const action: PendingShiftAction = {
        id,
        companyId,
        branchId,
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

export async function addOfflineHold(companyId: number, cartData: any, customerId: string, holdName: string, branchId?: number | null): Promise<string> {
    const db = await getDb();
    const id = `hold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const hold: OfflineHold = {
        id,
        companyId,
        branchId,
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

export async function addPendingSale(companyId: number, invoiceData: any, branchId?: number | null): Promise<string> {
    const db = await getDb();
    const id = `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const sale: PendingSale = {
        id,
        companyId,
        branchId,
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
