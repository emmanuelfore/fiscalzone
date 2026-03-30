import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session ?? null;

    const headers = new Headers(init?.headers);

    if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    if (!(init?.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    // Prepend API_BASE for relative paths (e.g. /api/...)
    const url = typeof input === "string" && input.startsWith("/")
        ? `${API_BASE}${input}`
        : input;

    // multi-branch support: inject current branch ID if available
    const branchId = localStorage.getItem("selectedBranchId");
    if (branchId) {
        headers.set("X-Branch-ID", branchId);
    }

    const controller = init?.signal ? null : new AbortController();
    const timeoutId = controller ? window.setTimeout(() => {
        console.warn(`[apiFetch] Request to ${url} timed out after 120s - aborting.`);
        try {
            // @ts-ignore - abort with reason is supported in modern browsers
            controller.abort("TIMEOUT");
        } catch (e) {
            controller.abort();
        }
    }, 120000) : null;

    try {
        return await fetch(url, {
            ...init,
            headers,
            signal: init?.signal ?? controller?.signal,
        });
    } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
    }
}

/** Helper to update selected branch in storage */
export function setSelectedBranchId(id: number | null) {
    if (id) {
        localStorage.setItem("selectedBranchId", id.toString());
    } else {
        localStorage.removeItem("selectedBranchId");
    }
}
