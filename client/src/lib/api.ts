import { supabase } from "./supabase";

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

    const controller = init?.signal ? null : new AbortController();
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 30000) : null;

    try {
        return await fetch(input, {
            ...init,
            headers,
            signal: init?.signal ?? controller?.signal,
        });
    } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
    }
}
