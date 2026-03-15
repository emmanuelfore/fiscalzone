import AsyncStorage from "@react-native-async-storage/async-storage";

type PendingSale = {
  id: string;
  companyId: number;
  createdAt: string;
  payload: any;
};

type PendingShiftAction =
  | { id: string; companyId: number; createdAt: string; type: "open"; payload: { openingBalance: string } }
  | { id: string; companyId: number; createdAt: string; type: "close"; payload: { shiftId: number; closingBalance: string } };

const KEYS = {
  pendingSales: "pendingSales",
  pendingShiftActions: "pendingShiftActions",
  provisionalShift: "provisionalShift"
} as const;

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: any) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function addPendingSale(companyId: number, payload: any): Promise<string> {
  const list = await readJson<PendingSale[]>(KEYS.pendingSales, []);
  const id = uid();
  list.push({ id, companyId, createdAt: new Date().toISOString(), payload });
  await writeJson(KEYS.pendingSales, list);
  return id;
}

export async function getPendingSales(companyId: number): Promise<PendingSale[]> {
  const list = await readJson<PendingSale[]>(KEYS.pendingSales, []);
  return list.filter((x) => x.companyId === companyId);
}

export async function removePendingSale(id: string) {
  const list = await readJson<PendingSale[]>(KEYS.pendingSales, []);
  await writeJson(
    KEYS.pendingSales,
    list.filter((x) => x.id !== id)
  );
}

export async function addPendingShiftAction(action: Omit<PendingShiftAction, "id" | "createdAt">): Promise<string> {
  const list = await readJson<PendingShiftAction[]>(KEYS.pendingShiftActions, []);
  const id = uid();
  list.push({ ...action, id, createdAt: new Date().toISOString() } as PendingShiftAction);
  await writeJson(KEYS.pendingShiftActions, list);
  return id;
}

export async function getPendingShiftActions(companyId: number): Promise<PendingShiftAction[]> {
  const list = await readJson<PendingShiftAction[]>(KEYS.pendingShiftActions, []);
  return list.filter((x) => x.companyId === companyId);
}

export async function removePendingShiftAction(id: string) {
  const list = await readJson<PendingShiftAction[]>(KEYS.pendingShiftActions, []);
  await writeJson(
    KEYS.pendingShiftActions,
    list.filter((x) => x.id !== id)
  );
}

export async function setProvisionalShift(companyId: number, shift: any | null) {
  const key = `${KEYS.provisionalShift}:${companyId}`;
  if (!shift) {
    await AsyncStorage.removeItem(key);
    return;
  }
  await writeJson(key, shift);
}

export async function getProvisionalShift(companyId: number): Promise<any | null> {
  const key = `${KEYS.provisionalShift}:${companyId}`;
  return readJson<any | null>(key, null);
}

