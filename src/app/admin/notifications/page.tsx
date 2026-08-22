'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Bell, Upload, Send } from 'lucide-react';
import { sendBroadcastNotification } from '@/app/actions/admin';

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGrade, setTargetGrade] = useState('all');
  const [imageUrl, setImageUrl] = useState('');
  const [pending, startTransition] = useTransition();

  function onSend() {
    if (!title.trim() || !message.trim()) {
      toast.error('يرجى ملء عنوان الإشعار والرسالة');
      return;
    }

    startTransition(async () => {
      const res = await sendBroadcastNotification({
        title,
        message,
        targetGrade,
        imageUrl: imageUrl.trim() || undefined,
      });

      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      toast.success('تم إرسال الإشعار بنجاح إلى الطلاب 🎉');
      setTitle('');
      setMessage('');
      setImageUrl('');
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="font-display text-2xl font-black text-brand-900 dark:text-white flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600 dark:text-cyan-400" />
          إرسال إشعارات ورسائل للطلاب
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          أرسل إشعارات مخصصة لصف دراسي معين أو لجميع الطلاب مع إمكانية إرفاق صورة.
        </p>
      </div>

      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold">إنشاء إشعار جماعي جديد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target Grade */}
          <div>
            <Label className="font-bold text-slate-800 dark:text-slate-200">الفئة المستهدفة (الصف الدراسي)</Label>
            <select
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">📢 إرسال لجميع الطلاب في كل الصفوف</option>
              <option value="1st_bac">🎓 الصف الأول بكالوريا فقط</option>
              <option value="2nd_bac">🎓 الصف الثاني بكالوريا فقط</option>
            </select>
          </div>

          {/* Notification Title */}
          <div>
            <Label className="font-bold text-slate-800 dark:text-slate-200">عنوان الإشعار</Label>
            <Input
              placeholder="مثال: تنبيه هام بخصوص موعد الامتحان الأسبوعي"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl"
            />
          </div>

          {/* Notification Message */}
          <div>
            <Label className="font-bold text-slate-800 dark:text-slate-200">نص الرسالة / الإشعار</Label>
            <Textarea
              placeholder="اكتب تفاصيل التنبيه أو التعليمات للطلاب هنا..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 min-h-[120px] text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl"
            />
          </div>

          {/* Image Attachment */}
          <div className="space-y-2">
            <Label className="font-bold text-slate-800 dark:text-slate-200">إرفاق صورة مع الإشعار (اختياري)</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:from-blue-500 transition">
                <Upload className="h-4 w-4" />
                <span>اختر صورة من جهاز الكمبيوتر</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setImageUrl(event.target?.result as string);
                        toast.success('تم اختيار الصورة للإشعار');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              <span className="text-xs text-slate-400">أو رابط صورة مباشر:</span>
            </div>
            <Input
              placeholder="رابط الصورة https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-900 rounded-2xl"
            />

            {/* Image Preview */}
            {imageUrl && (
              <div className="mt-2 relative h-36 w-60 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="معاينة صورة الإشعار" className="h-full w-full object-cover" />
              </div>
            )}
          </div>

          <div className="pt-3">
            <Button
              onClick={onSend}
              disabled={pending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {pending ? 'جاري إرسال الإشعار للطلاب...' : 'إرسال الإشعار الآن 🚀'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
