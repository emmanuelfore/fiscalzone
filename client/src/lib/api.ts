import { supabase } from "./supabase";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const { data: { session } } = await supabase.auth.getSession();

    const headers = new Headers(init?.headers);

    if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    if (!(init?.body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
    }

    return fetch(input, {
        ...init,
        headers,
    });
}
