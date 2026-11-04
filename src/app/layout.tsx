import type { Metadata, Viewport } from 'next';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/600.css';
import '@fontsource/cairo/700.css';
import '@fontsource/cairo/900.css';
import '@fontsource/tajawal/400.css';
import '@fontsource/tajawal/500.css';
import '@fontsource/tajawal/700.css';
import '@fontsource/tajawal/900.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from './providers';

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

      suppressHydrationWarning
    >
      <body className="min-h-screen bg-soft font-sans text-slate-900">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
