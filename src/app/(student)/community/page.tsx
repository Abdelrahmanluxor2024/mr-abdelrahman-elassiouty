'use client';

import { PlatformGroupFeed } from '@/components/community/platform-group-feed';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';

export default function StudentCommunityPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md text-white">
              <MessageSquare className="h-5 w-5" />
            </span>
            <Badge className="bg-white/20 text-white border-0 text-xs px-2.5 py-0.5">
              جروب المنصة الرسمي
            </Badge>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
            جروب المنصة 📢
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
            هنا ينشر مستر عبدالرحمن الأسيوطي آخر الأخبار، التحديات البرمجية، والملاحظات الهامة لجميع طلاب المنصة. يمكنك التفاعل والتعليق والمناقشة!
          </p>
        </div>
        <div className="absolute -left-10 -bottom-10 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
      </div>

      <PlatformGroupFeed />
    </div>
  );
}
