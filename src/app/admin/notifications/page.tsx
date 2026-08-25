'use client';

import { useState, useTransition, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Bell, Upload, Send, Trash2, Pencil, X, Check, Users } from 'lucide-react';
import {
  sendBroadcastNotification,
  getAdminNotifications,
  updateBroadcastNotification,
  deleteBroadcastNotification,
} from '@/app/actions/admin';

type NotificationGroup = {
  title: string;
  message: string;
  link: string | null;
  count: number;
  readCount: number;
  createdAt: string;
};

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGrade, setTargetGrade] = useState('all');
  const [imageUrl, setImageUrl] = useState('');
  const [pending, startTransition] = useTransition();
  const [editingGroup, setEditingGroup] = useState<NotificationGroup | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [deletingGroup, setDeletingGroup] = useState<NotificationGroup | null>(null);
  const qc = useQueryClient();

  const { data: rawNotifications = [], isLoading: loadingList } = useQuery({
    queryKey: ['admin', 'notifications'],
    queryFn: () => getAdminNotifications(),
  });

  const notificationGroups = useMemo<NotificationGroup[]>(() => {
    const map = new Map<string, NotificationGroup>();
    for (const n of rawNotifications) {
      const key = `${n.title}|||${n.message}`;
      if (!map.has(key)) {
        map.set(key, { title: n.title, message: n.message, link: n.link, count: 0, readCount: 0, createdAt: n.created_at });
      }
      const g = map.get(key)!;
      g.count += 1;
      if (n.is_read) g.readCount += 1;
      if (n.created_at > g.createdAt) g.createdAt = n.created_at;
    }
    return Array.from(map.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [rawNotifications]);

  function onSend() {
    if (!title.trim() || !message.trim()) { toast.error('يرجى ملء عنوان الإشعار والرسالة'); return; }
    startTransition(async () => {
      const res = await sendBroadcastNotification({ title, message, targetGrade, imageUrl: imageUrl.trim() || undefined });
      if (!res.ok) { toast.error(res.error); return; }
      toast.success('تم إرسال الإشعار بنجاح إلى الطلاب 🎉');
      setTitle(''); setMessage(''); setImageUrl('');
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    });
  }

  function startEdit(group: NotificationGroup) {
    setEditingGroup(group); setEditTitle(group.title); setEditMessage(group.message);
  }

  function onSaveEdit() {
    if (!editingGroup || !editTitle.trim() || !editMessage.trim()) return;
    startTransition(async () => {
      const res = await updateBroadcastNotification({ title: editingGroup.title, message: editingGroup.message, newTitle: editTitle, newMessage: editMessage });
      if (!res.ok) { toast.error('حدث خطأ أثناء التعديل'); return; }
      toast.success('تم تعديل الإشعار بنجاح ✅');
      setEditingGroup(null);
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    });
  }

  function onConfirmDelete() {
    if (!deletingGroup) return;
    startTransition(async () => {
      const res = await deleteBroadcastNotification({ title: deletingGroup.title, message: deletingGroup.message });
      if (!res.ok) { toast.error('حدث خطأ أثناء الحذف'); return; }
      toast.success('تم حذف الإشعار من جميع الطلاب ✅');
      setDeletingGroup(null);
      qc.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    });
  }

  return (
    <div className="space-y-8" dir="rtl">
      <div>
        <h1 className="font-display text-2xl font-black text-brand-900 dark:text-white flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-600 dark:text-cyan-400" />
          إرسال إشعارات ورسائل للطلاب
        </h1>
        <p className="text-xs text-slate-500 mt-1">أرسل إشعارات مخصصة لصف دراسي معين أو لجميع الطلاب، وعدّل أو احذف الإشعارات المرسلة.</p>
      </div>

      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader><CardTitle className="text-base font-bold">إنشاء إشعار جماعي جديد</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-bold text-slate-800 dark:text-slate-200">الفئة المستهدفة (الصف الدراسي)</Label>
            <select value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} className="mt-1.5 h-11 w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">📢 إرسال لجميع الطلاب في كل الصفوف</option>
              <option value="1st_secondary">🎓 أولى ثانوي فقط</option>
              <option value="2nd_secondary">🎓 تانية ثانوي فقط</option>
              <option value="3rd_secondary">🎓 تالتة ثانوي فقط</option>
            </select>
          </div>
          <div>
            <Label className="font-bold text-slate-800 dark:text-slate-200">عنوان الإشعار</Label>
            <Input placeholder="مثال: تنبيه هام بخصوص موعد الامتحان الأسبوعي" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl" />
          </div>
          <div>
            <Label className="font-bold text-slate-800 dark:text-slate-200">نص الرسالة / الإشعار</Label>
            <Textarea placeholder="اكتب تفاصيل التنبيه أو التعليمات للطلاب هنا..." value={message} onChange={(e) => setMessage(e.target.value)} className="mt-1.5 min-h-[120px] text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold text-slate-800 dark:text-slate-200">إرفاق صورة مع الإشعار (اختياري)</Label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:from-blue-500 transition">
                <Upload className="h-4 w-4" /><span>اختر صورة من جهاز الكمبيوتر</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (ev) => { setImageUrl(ev.target?.result as string); toast.success('تم اختيار الصورة للإشعار'); }; reader.readAsDataURL(file); } }} />
              </label>
              <span className="text-xs text-slate-400">أو رابط صورة مباشر:</span>
            </div>
            <Input placeholder="رابط الصورة https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="text-xs bg-slate-50 dark:bg-slate-900 rounded-2xl" />
            {imageUrl && (
              <div className="mt-2 relative h-36 w-60 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="معاينة صورة الإشعار" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <div className="pt-3">
            <Button onClick={onSend} disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
              <Send className="h-4 w-4" />
              {pending ? 'جاري إرسال الإشعار للطلاب...' : 'إرسال الإشعار الآن 🚀'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-500" />الإشعارات المرسلة ({notificationGroups.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingList ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 w-full rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />)}</div>
          ) : notificationGroups.length === 0 ? (
            <div className="p-10 text-center text-slate-400"><Bell className="mx-auto h-8 w-8 mb-2 opacity-40" /><p className="text-sm font-semibold">لم يتم إرسال أي إشعارات بعد</p></div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notificationGroups.map((group, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-cyan-400"><Bell className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{group.title}</p>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{group.message}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-slate-400"><Users className="h-3 w-3" />{group.count} طالب استقبله</span>
                      <span className="text-[11px] text-emerald-500 font-medium">{group.readCount} قرأه</span>
                      <span className="text-[11px] text-slate-400 font-mono">{new Date(group.createdAt).toLocaleString('ar-EG')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => startEdit(group)} className="h-8 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 text-xs px-2.5 gap-1"><Pencil className="h-3.5 w-3.5" />تعديل</Button>
                    <Button size="sm" variant="outline" onClick={() => setDeletingGroup(group)} className="h-8 rounded-xl border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 text-xs px-2.5 gap-1"><Trash2 className="h-3.5 w-3.5" />حذف</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {editingGroup && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg rounded-3xl border-2 border-amber-400 bg-white dark:bg-[#0E172A] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-black text-slate-900 dark:text-white flex items-center gap-2"><Pencil className="h-5 w-5 text-amber-500" />تعديل الإشعار</h3>
              <Button size="sm" variant="ghost" onClick={() => setEditingGroup(null)} className="rounded-xl h-8 w-8 p-0 text-slate-400 hover:text-red-500"><X className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 font-medium">⚠️ سيتم تعديل الإشعار لدى جميع الطلاب الذين استقبلوه ({editingGroup.count} طالب)</p>
            <div className="space-y-3">
              <div><Label className="text-xs font-bold text-slate-700 dark:text-slate-300">العنوان الجديد</Label><Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="mt-1 font-bold rounded-2xl bg-slate-50 dark:bg-slate-900" /></div>
              <div><Label className="text-xs font-bold text-slate-700 dark:text-slate-300">نص الرسالة الجديد</Label><Textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} className="mt-1 min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-900 text-sm" /></div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setEditingGroup(null)} className="rounded-xl text-xs">إلغاء</Button>
              <Button onClick={onSaveEdit} disabled={pending} className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs gap-1.5"><Check className="h-3.5 w-3.5" />{pending ? 'جاري الحفظ...' : 'حفظ التعديلات'}</Button>
            </div>
          </Card>
        </div>
      )}

      {deletingGroup && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md rounded-3xl border-2 border-red-500 bg-white dark:bg-[#0E172A] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-black text-red-600 flex items-center gap-2"><Trash2 className="h-5 w-5" />تأكيد الحذف</h3>
              <Button size="sm" variant="ghost" onClick={() => setDeletingGroup(null)} className="rounded-xl h-8 w-8 p-0 text-slate-400"><X className="h-4 w-4" /></Button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-3 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white text-sm">{deletingGroup.title}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{deletingGroup.message}</p>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">سيتم حذف هذا الإشعار نهائياً من قائمة <span className="font-black">{deletingGroup.count} طالب</span>. هذا الإجراء لا يمكن التراجع عنه.</p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setDeletingGroup(null)} className="rounded-xl text-xs">إلغاء</Button>
              <Button onClick={onConfirmDelete} disabled={pending} className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs gap-1.5"><Trash2 className="h-3.5 w-3.5" />{pending ? 'جاري الحذف...' : 'نعم، احذف الإشعار'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}