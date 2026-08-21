'use client';

import { MessageCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function WhatsAppButton() {
  const pathname = usePathname();
  const whatsappUrl = 'https://wa.me/201064106070?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D9%85%D8%B3%D8%AA%D8%B1%20%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86%D8%8C%20%D8%A3%D9%88%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B3%D8%AA%D9%81%D8%D8%B3%D8%A7%D8%B1%20%D8%B9%D9%86%20%D8%AA%D9%81%D8%A7%D8%B5%D9%8A%D9%84%20%D8%A7%D9%84%D9%85%D9%86%D8%B5%D8%A9';

  // Do not show the support widget inside exams to avoid distractions/cheating
  if (pathname?.startsWith('/exam')) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-6 z-40 flex items-center gap-3">
      {/* Greeting Bubble Tooltip */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-[#0B1324]/90 px-4 py-2.5 shadow-2xl backdrop-blur-md transition-all hover:scale-105 border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0B1324]/95 group"
      >
        <div className="text-right">
          <p className="text-xs font-black text-cyan-500 dark:text-cyan-400">
            أهلاً يا صديقي! 👋
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            اسألنا هنا لو عندك أي استفسار ❤️
          </p>
        </div>
      </a>

      {/* WhatsApp Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-2xl shadow-blue-500/40 transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="تواصل معنا عبر واتساب: 01064106070"
        title="تواصل معنا على واتساب: 01064106070"
      >
        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
        </span>
        <MessageCircle className="h-7 w-7 text-white group-hover:rotate-12 transition-transform" />
      </a>
    </div>
  );
}
