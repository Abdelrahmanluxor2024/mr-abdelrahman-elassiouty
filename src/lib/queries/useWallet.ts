'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import type { WalletTransaction, ChargeCode } from '@/types/supabase';

function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function useWalletTransactions() {
  return useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: async (): Promise<WalletTransaction[]> => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as WalletTransaction[];
    },
  });
}

/** Used in admin pages — accepts a generated code and returns the row if found + unused. */
export async function redeemChargeCode(code: string) {
  const supabase = browserClient();
  const { data, error } = await supabase
    .from('charge_codes')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .eq('is_used', false)
    .maybeSingle();
  if (error) throw error;
  return data as ChargeCode | null;
}
