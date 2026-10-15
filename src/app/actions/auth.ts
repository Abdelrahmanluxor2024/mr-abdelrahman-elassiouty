'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Logout - clears cookies and redirects to login
 */
export async function logout() {
  const cookieStore = cookies();
  cookieStore.delete('token');
  cookieStore.delete('user_role');
  redirect('/login');
}

/**
 * Legacy stubs - kept to prevent import errors in old pages
 * These are no-ops now that auth is handled client-side via Firebase
 */
export async function registerStudent(_input: any): Promise<{ ok: boolean; error?: string }> {
  return { ok: false, error: 'Use client-side Firebase auth instead' };
}

export async function loginWithPhone(_input: any): Promise<{ ok: boolean; error?: string; email?: string }> {
  return { ok: false, error: 'Use client-side Firebase auth instead' };
}
