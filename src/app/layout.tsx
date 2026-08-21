import type { Metadata, Viewport } from 'next';
import { Cairo, Tajawal, Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '900'],
  display: 'swap',
  variable: '--font-cairo',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '900'],
  display: 'swap',
  variable: '--font-tajawal',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'منصة مستر عبدالرحمن الأسيوطي | البرمجة لطلاب الثانوية',
    template: '%s | مستر عبدالرحمن الأسيوطي',
  },
  description:
    'منصة تعليمية متخصصة في مادة البرمجة لطلاب الثانوية العامة مع مستر عبدالرحمن الأسيوطي. محاضرات، امتحانات تفاعلية، ومتابعة مستوى دقيقة.',
  keywords: ['برمجة', 'ثانوية عامة', 'مستر عبدالرحمن', 'منصة تعليمية'],
  authors: [{ name: 'مستر عبدالرحمن الأسيوطي' }],
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    siteName: 'منصة مستر عبدالرحمن الأسيوطي',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A1F44',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tajawal.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-soft font-sans text-slate-900">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
