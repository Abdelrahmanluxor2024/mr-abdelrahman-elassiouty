import { createClient } from '@supabase/supabase-js';

/**
 * Service-role admin client. NEVER expose this to the browser.
 * Use only inside server actions or route handlers.
 * Falls back to placeholder values when Supabase is not configured (Firebase-only setup).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): ReturnType<typeof createClient<any>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

  return createClient<any>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
