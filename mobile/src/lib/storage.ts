import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  selectedCompanyId: "selectedCompanyId",
  selectedBranchId: "selectedBranchId",
  pausedState: "pausedState"
} as const;

export async function getSelectedCompanyId(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEYS.selectedCompanyId);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function getSelectedBranchId(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEYS.selectedBranchId);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function setSelectedBranchId(branchId: number | null) {
  if (branchId === null) {
    await AsyncStorage.removeItem(KEYS.selectedBranchId);
  } else {
    await AsyncStorage.setItem(KEYS.selectedBranchId, String(branchId));
  }
}

export async function setSelectedCompanyId(companyId: number | null) {
  if (companyId === null) {
    await AsyncStorage.removeItem(KEYS.selectedCompanyId);
  } else {
    await AsyncStorage.setItem(KEYS.selectedCompanyId, String(companyId));
  }
}

export async function clearSelectedCompanyId() {
  await AsyncStorage.removeItem(KEYS.selectedCompanyId);
}

export type PausedState = {
  paused: boolean;
  pausedAt: string | null;
};

export async function getPausedState(): Promise<PausedState> {
  const raw = await AsyncStorage.getItem(KEYS.pausedState);
  if (!raw) return { paused: false, pausedAt: null };
  try {
    const parsed = JSON.parse(raw) as PausedState;
    return {
      paused: !!parsed.paused,
      pausedAt: parsed.pausedAt ?? null
    };
  } catch {
    return { paused: false, pausedAt: null };
  }
}

export async function setPausedState(next: PausedState) {
  await AsyncStorage.setItem(KEYS.pausedState, JSON.stringify(next));
}

