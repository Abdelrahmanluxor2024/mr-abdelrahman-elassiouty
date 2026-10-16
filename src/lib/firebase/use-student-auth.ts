'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';
import type { FirebaseUser } from './types';

export interface StudentProfileData {
  id: string;
  fullName: string;
  phone: string;
  grade: string;
  governorate: string;
  school: string;
  walletBalance: number;
  avatarUrl: string;
  role: string;
}

const DEFAULT_PROFILE: StudentProfileData = {
  id: 'current-student',
  fullName: 'طالب المنصة',
  phone: '',
  grade: '2nd_bac',
  governorate: 'القاهرة',
  school: '',
  walletBalance: 0,
  avatarUrl: '',
  role: 'student',
};

const STORAGE_KEY = 'mr_ass_student_profile';

export function getCachedStudentProfile(): StudentProfileData {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.fullName) {
        return {
          id: parsed.id || parsed.uid || 'current-student',
          fullName: parsed.fullName || parsed.full_name || 'طالب المنصة',
          phone: parsed.phone || '',
          grade: parsed.grade || '2nd_bac',
          governorate: parsed.governorate || 'القاهرة',
          school: parsed.school || '',
          walletBalance: Number(parsed.walletBalance || parsed.wallet_balance || 0),
          avatarUrl: parsed.avatarUrl || parsed.avatar_url || '',
          role: parsed.role || 'student',
        };
      }
    }
  } catch (err) {
    console.warn('Error reading cached student profile', err);
  }
  return DEFAULT_PROFILE;
}

export function saveCachedStudentProfile(data: Partial<StudentProfileData> & { id: string; fullName: string }) {
  if (typeof window === 'undefined') return;
  try {
    const current = getCachedStudentProfile();
    const updated = { ...current, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Also sync cookies
    document.cookie = `token=${updated.id}; path=/; max-age=2592000`;
    document.cookie = `user_role=${updated.role || 'student'}; path=/; max-age=2592000`;
  } catch (err) {
    console.warn('Error saving cached student profile', err);
  }
}

export function useCurrentStudent() {
  const [student, setStudent] = useState<StudentProfileData>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLiveProfile = useCallback(async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        const prof: StudentProfileData = {
          id: uid,
          fullName: d.fullName || d.full_name || 'طالب المنصة',
          phone: d.phone || '',
          grade: d.grade || '2nd_bac',
          governorate: d.governorate || 'القاهرة',
          school: d.school || '',
          walletBalance: Number(d.walletBalance || d.wallet_balance || 0),
          avatarUrl: d.avatarUrl || d.avatar_url || '',
          role: d.role || 'student',
        };
        setStudent(prof);
        saveCachedStudentProfile(prof);
      }
    } catch (err) {
      console.warn('Failed to fetch live Firestore profile', err);
    }
  }, []);

  useEffect(() => {
    // 1. Instant paint from cache
    const cached = getCachedStudentProfile();
    setStudent(cached);
    setIsLoading(false);

    // 2. Listen to Firebase auth state change
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchLiveProfile(user.uid);
      } else {
        // Check if we have token in cookie
        const cookieToken = document.cookie
          .split('; ')
          .find((row) => row.startsWith('token='))
          ?.split('=')[1];

        if (cookieToken && cookieToken !== 'current-student') {
          fetchLiveProfile(cookieToken);
        }
      }
    });

    return () => unsubscribe();
  }, [fetchLiveProfile]);

  const logout = useCallback(async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    }
  }, []);

  return { student, isLoading, logout, refreshStudent: () => fetchLiveProfile(student.id) };
}
