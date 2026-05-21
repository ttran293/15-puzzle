import { createClient, SupabaseClient } from "@supabase/supabase-js";

const getJwtRole = (jwt: string): string | null => {
  try {
    const payload = jwt.split(".")[1];
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: string;
    };

    return decoded.role ?? null;
  } catch {
    return null;
  }
};

export const createAdminClient = (): SupabaseClient => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const role = getJwtRole(serviceRoleKey);
  if (role === "anon") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is set to the anon/public key. Use the service_role secret from Supabase → Project Settings → API instead.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
