'use server';

export async function purchaseCourse(_courseId: string) {
  return { ok: false as const, error: 'سيتم تفعيل نظام المحفظة قريباً' };
}

export async function topUpWallet(_input: { amount: number; code: string }) {
  return { ok: false as const, error: 'سيتم تفعيل الشحن قريباً' };
}
