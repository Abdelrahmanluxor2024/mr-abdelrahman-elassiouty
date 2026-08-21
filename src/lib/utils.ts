import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatArabicNumber(value: number | string): string {
  const num = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString('en-US');
}

export function formatCurrencyEGP(value: number) {
  return `${formatArabicNumber(value)} ج.م`;
}

export function shortId() {
  return Math.random().toString(36).slice(2, 10);
}

export function isEgyptianPhone(phone: string) {
  return /^01[0125]\d{8}$/.test(phone);
}

export function phoneToEmail(phone: string) {
  return `${phone}@mrass.app`;
}

export function emailToPhone(email: string) {
  return email.split('@')[0];
}
