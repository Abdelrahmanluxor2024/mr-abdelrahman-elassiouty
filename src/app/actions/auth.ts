'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { isEgyptianPhone, phoneToEmail } from '@/lib/utils';
import type { Student } from '@/types/supabase';

export type AuthResult =
  | { ok: true; student: Pick<Student, 'id' | 'full_name' | 'phone'> }
  | { ok: false; error: string };

/**
 * Register a new student.
 *
 * Strategy: create a Supabase auth user with email = `phone@mrass.app`
 * (so the student can use Supabase auth + RLS) and a students table row
 * with the SAME id (auth.users.id). The password on the auth user is a
 * random 32-char string we never expose — login always goes through
 * `loginWithPhone()` which uses the service role to issue a session.
 */
export async function registerStudent(input: {
  phone: string;
  password: string;
  full_name: string;
  parent_phone?: string;
  governorate?: string;
  school?: string;
  grade?: '1st_secondary' | '2nd_secondary' | '3rd_secondary' | '1st_bac' | '2nd_bac' | string;
  device_fingerprint: string;
}): Promise<AuthResult> {
  if (!isEgyptianPhone(input.phone)) {
    return { ok: false, error: 'رقم الهاتف غير صالح (يجب أن يكون رقم مصري).' };
  }
  if (input.password.length < 6) {
    return { ok: false, error: 'كلمة المرور يجب ألا تقل عن 6 أحرف.' };
  }
  if (!input.full_name.trim()) {
    return { ok: false, error: 'الاسم مطلوب.' };
  }

  const admin = createAdminClient();
  const password_hash = await bcrypt.hash(input.password, 10);

  // 1) Create the Supabase auth user first with real password
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: phoneToEmail(input.phone),
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  });

  if (authError || !authData?.user) {
    if (authError?.message?.toLowerCase().includes('already')) {
      return { ok: false, error: 'رقم الهاتف مسجل من قبل.' };
    }
    return { ok: false, error: authError?.message ?? 'فشل إنشاء المستخدم.' };
  }

  const userId = authData.user.id;

  // 2) Create students row with same id
  const { data: student, error: insertError } = await admin
    .from('students')
    .insert({
      id: userId,
      phone: input.phone,
      password_hash,
      full_name: input.full_name,
      parent_phone: input.parent_phone ?? null,
      governorate: input.governorate ?? null,
      school: input.school ?? null,
      grade: input.grade ?? '3rd_secondary',
      device_id_1: input.device_fingerprint,
    })
    .select('id, full_name, phone')
    .single();

  if (insertError || !student) {
    // Rollback: delete the auth user to keep things consistent
    await admin.auth.admin.deleteUser(userId);
    if (insertError?.code === '23505') {
      return { ok: false, error: 'رقم الهاتف مسجل من قبل.' };
    }
    return { ok: false, error: insertError?.message ?? 'فشل إنشاء الحساب.' };
  }

  return { ok: true, student };
}

export type LoginResult =
  | { ok: true; email: string; student: Pick<Student, 'id' | 'full_name' | 'phone'> }
  | { ok: false; error: string };

export async function loginWithPhone(input: {
  phone: string;
  password: string;
  device_fingerprint: string;
}): Promise<LoginResult> {
  if (!isEgyptianPhone(input.phone)) {
    return { ok: false, error: 'رقم الهاتف غير صالح.' };
  }

  const admin = createAdminClient();
  const { data: student, error } = await admin
    .from('students')
    .select('id, full_name, phone, password_hash, is_active, device_id_1, device_id_2')
    .eq('phone', input.phone)
    .single();

  if (error || !student) {
    return { ok: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' };
  }
  if (!student.is_active) {
    return { ok: false, error: 'الحساب معطّل، تواصل مع الإدارة.' };
  }

  const ok = await bcrypt.compare(input.password, student.password_hash);
  if (!ok) {
    return { ok: false, error: 'رقم الهاتف أو كلمة المرور غير صحيحة.' };
  }

  // Device lock (max 2)
  const fp = input.device_fingerprint;
  if (student.device_id_1 !== fp && student.device_id_2 !== fp) {
    if (student.device_id_1 && student.device_id_2) {
      return {
        ok: false,
        error:
          'تم استخدام الحد الأقصى للأجهزة (2). لإضافة جهاز جديد تواصل مع الإدارة.',
      };
    }
    await admin
      .from('students')
      .update({
        device_id_1: student.device_id_1 ?? fp,
        device_id_2: student.device_id_1 ? fp : null,
      })
      .eq('id', student.id);
  }

  const userEmail = phoneToEmail(input.phone);

  // Sync Supabase Auth password to ensure signInWithPassword works seamlessly
  await admin.auth.admin.updateUserById(student.id, {
    password: input.password,
    email_confirm: true,
  });

  return {
    ok: true,
    email: userEmail,
    student: { id: student.id, full_name: student.full_name, phone: student.phone },
  };
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function updateStudentAvatar(avatarUrl: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'يجب تسجيل الدخول أولاً' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('students')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { ok: true as const };
}

