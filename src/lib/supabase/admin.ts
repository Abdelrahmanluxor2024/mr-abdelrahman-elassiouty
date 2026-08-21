import { createClient } from '@supabase/supabase-js';

/**
 * Service-role admin client. NEVER expose this to the browser.
 * Use only inside server actions or route handlers.
 * We use `any` for the Database generic to avoid complex type inference
 * issues with supabase-js v2. Explicit types are applied at the call site.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): ReturnType<typeof createClient<any>> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
