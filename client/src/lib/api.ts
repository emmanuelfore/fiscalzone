import { supabase } from "./supabase";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const sessionResult = (await Promise.race([
        supabase.auth.getSession(),
        new Promise((resolve) =>
            window.setTimeout(() => resolve({ data: { session: null } }), 2000)
        ),
    ])) as { data?: { session: { access_token?: string } | null } };

    const session = sessionResult?.data?.session ?? null;

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
