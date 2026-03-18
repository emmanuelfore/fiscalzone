import { supabase } from "./supabase";

export async function invokeFunction<TResponse = unknown>(
  name: string,
  body?: Record<string, unknown>
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ?? {}
  });
  if (error) throw error;
  return data as TResponse;
}

