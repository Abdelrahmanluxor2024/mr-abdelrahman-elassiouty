'use client';

import { MessageSquare, Sparkles } from 'lucide-react';

// Placeholder community feed - will be rebuilt with Firebase
export function PlatformGroupFeed() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0E172A] p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-cyan-400" />
        <h3 className="font-bold text-white text-lg">جروب ومنتدى المنصة</h3>
        <span className="rounded-xl bg-blue-600/20 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-black text-cyan-300">
          قريباً
        </span>
      </div>
      <div className="grid place-items-center py-12 text-center space-y-3">
        <div className="h-16 w-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 grid place-items-center">
          <Sparkles className="h-8 w-8 text-blue-400" />
        </div>
        <p className="text-slate-400 text-sm font-bold">منتدى المنصة قيد التطوير</p>
        <p className="text-xs text-slate-600 max-w-xs">
          سيتم إطلاق منتدى التفاعل بين الطلاب قريباً مع ميزات مشاركة الملاحظات والأسئلة
        </p>
      </div>
    </div>
  );
}
