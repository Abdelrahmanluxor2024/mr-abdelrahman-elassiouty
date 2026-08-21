'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type RedeemResult =
  | { ok: true; amount: number; newBalance: number }
  | { ok: false; error: string };

/**
 * Redeem a charge code. Server-side only, wrapped in a Postgres function
 * to be atomic (see db/schema.sql `redeem_charge_code`).
 *
 * Falls back to manual implementation if the RPC is not yet deployed.
 */
export async function redeemChargeCode(code: string): Promise<RedeemResult> {
  if (!code || code.trim().length < 4) {
    return { ok: false, error: 'كود الشحن غير صالح.' };
  }
  const cleanCode = code.trim().toUpperCase();
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'لازم تسجّل دخولك.' };
  const studentId = (user.user_metadata?.student_id as string) ?? user.id;

  const admin = createAdminClient();

  // Try RPC first
  const { data: rpcData, error: rpcError } = await admin.rpc('redeem_charge_code', {
    p_code: cleanCode,
    p_student_id: studentId,
  });

  if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
    revalidatePath('/wallet');
    return { ok: true, amount: Number(rpcData[0].amount), newBalance: Number(rpcData[0].new_balance) };
  }

  // Fallback: manual flow
  const { data: charge, error } = await admin
    .from('charge_codes')
    .select('*')
    .eq('code', cleanCode)
    .eq('is_used', false)
    .maybeSingle();
  if (error || !charge) return { ok: false, error: 'كود الشحن غير صالح أو مستخدم.' };

  const { data: student } = await admin.from('students').select('wallet_balance').eq('id', studentId).single();
  const before = Number(student?.wallet_balance ?? 0);
  const after = before + Number(charge.amount);

  const { error: updErr } = await admin
    .from('charge_codes')
    .update({ is_used: true, used_by: studentId, used_at: new Date().toISOString() })
    .eq('id', charge.id);
  if (updErr) return { ok: false, error: 'فشل استخدام الكود.' };

  const { error: stuErr } = await admin
    .from('students')
    .update({ wallet_balance: after })
    .eq('id', studentId);
  if (stuErr) return { ok: false, error: 'فشل تحديث الرصيد.' };

  await admin.from('wallet_transactions').insert({
    student_id: studentId,
    amount: charge.amount,
    transaction_type: 'topup',
    payment_method: 'code',
    reference_code: cleanCode,
    description: `شحن بكود ${cleanCode}`,
    balance_before: before,
    balance_after: after,
    status: 'completed',
  });

  revalidatePath('/wallet');
  return { ok: true, amount: Number(charge.amount), newBalance: after };
}

/** Fawry Pay checkout creator (sandbox) */
export async function startFawryCheckout(amount: number): Promise<{ ok: true; paymentUrl: string } | { ok: false; error: string }> {
  if (amount <= 0) return { ok: false, error: 'قيمة الشحن غير صالحة.' };

  // In production, this hits the Fawry API. For the demo we return a
  // synthetic URL pointing at our own payment-pending route.
  const paymentUrl = `/wallet/fawry-pending?amount=${amount}&ref=${crypto.randomUUID()}`;
  return { ok: true, paymentUrl };
}
