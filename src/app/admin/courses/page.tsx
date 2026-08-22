'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import { createCourse, publishCourse, updateCourse, deleteCourse } from '@/app/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Sparkles, Edit3, Trash2, X, Check } from 'lucide-react';

export default function AdminCoursesPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const qc = useQueryClient();
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    price: 0, 
    is_free: true, 
    duration_hours: 0,
    thumbnail_url: '/images/course-foundation-languages.jpg'
  });
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [pending, start] = useTransition();

  const { data: courses = [] } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  function onCreate() {
    if (!form.title) {
      toast.error('يرجى كتابة عنوان الكورس');
      return;
    }
    start(async () => {
      const res = await createCourse(form);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('تم إنشاء الكورس بنجاح');
      setForm({ 
        title: '', 
        description: '', 
        price: 0, 
        is_free: true, 
        duration_hours: 0,
        thumbnail_url: '/images/course-foundation-languages.jpg'
      });
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
    });
  }

  function onUpdate() {
    if (!editingCourse || !editingCourse.title) {
      toast.error('يرجى كتابة عنوان الكورس');
      return;
    }
    start(async () => {
      const res = await updateCourse({
        id: editingCourse.id,
        title: editingCourse.title,
        description: editingCourse.description || '',
        price: Number(editingCourse.price || 0),
        is_free: Boolean(editingCourse.is_free),
        duration_hours: Number(editingCourse.duration_hours || 0),
        thumbnail_url: editingCourse.thumbnail_url,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('تم تحديث بيانات الكورس والصورة بنجاح 🎉');
      setEditingCourse(null);
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
    });
  }

  async function onDelete(id: string, title: string) {
    if (!confirm(`هل أنت متأكد من حذف كورس "${title}" نهائياً؟`)) return;
    start(async () => {
      const res = await deleteCourse(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('تم حذف الكورس بنجاح');
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
    });
  }

  async function toggle(id: string, is_published: boolean) {
    const res = await publishCourse(id, is_published);
    if (!res.ok) toast.error(res.error);
    else qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="font-display text-2xl font-black text-brand-900 dark:text-white">إدارة وتعديل الكورسات</h1>

      {/* Edit Course Modal / Panel */}
      {editingCourse && (
        <Card className="border-2 border-blue-500 bg-blue-50/20 dark:bg-blue-950/30 shadow-xl rounded-3xl">
          <CardHeader className="flex flex-row items-center justify-between border-b border-blue-200 dark:border-blue-800 pb-3">
            <CardTitle className="text-blue-700 dark:text-cyan-300 flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              تعديل بيانات الكورس: {editingCourse.title}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditingCourse(null)} className="rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            <div>
              <Label className="font-bold text-slate-800 dark:text-slate-200">عنوان الكورس</Label>
              <Input 
                value={editingCourse.title} 
                onChange={(e) => setEditingCourse({ ...editingCourse, title: e.target.value })} 
                className="font-bold bg-white dark:bg-slate-900"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-800 dark:text-slate-200">المدة (ساعات)</Label>
              <Input 
                type="number" 
                value={editingCourse.duration_hours || 0} 
                onChange={(e) => setEditingCourse({ ...editingCourse, duration_hours: Number(e.target.value) })} 
                className="font-bold bg-white dark:bg-slate-900"
              />
            </div>

            <div className="sm:col-span-2 space-y-3">
              <Label className="font-bold text-slate-800 dark:text-slate-200">صورة الكورس / البوستر (Thumbnail)</Label>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:from-blue-500 transition">
                  <Upload className="h-4 w-4" />
                  <span>تغيير الصورة من جهاز الكمبيوتر</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const base64 = event.target?.result as string;
                          setEditingCourse({ ...editingCourse, thumbnail_url: base64 });
                          toast.success('تم اختيار الصورة الجديدة');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                <span className="text-xs text-slate-400">أو اكتب الرابط:</span>
              </div>

              <Input 
                value={editingCourse.thumbnail_url || ''} 
                onChange={(e) => setEditingCourse({ ...editingCourse, thumbnail_url: e.target.value })} 
                className="text-xs bg-white dark:bg-slate-900"
              />

              {editingCourse.thumbnail_url && (
                <div className="relative h-28 w-44 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={editingCourse.thumbnail_url} alt="معاينة" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label className="font-bold text-slate-800 dark:text-slate-200">الوصف</Label>
              <Textarea 
                value={editingCourse.description || ''} 
                onChange={(e) => setEditingCourse({ ...editingCourse, description: e.target.value })} 
                className="bg-white dark:bg-slate-900 min-h-[90px]"
              />
            </div>
            <div>
              <Label className="font-bold text-slate-800 dark:text-slate-200">السعر (ج.م)</Label>
              <Input 
                type="number" 
                disabled={editingCourse.is_free} 
                value={editingCourse.price || 0} 
                onChange={(e) => setEditingCourse({ ...editingCourse, price: Number(e.target.value) })} 
                className="font-bold bg-white dark:bg-slate-900"
              />
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={editingCourse.is_free} 
                  onChange={(e) => setEditingCourse({ ...editingCourse, is_free: e.target.checked })} 
                />
                كورس مجاني
              </label>
              <Button onClick={onUpdate} disabled={pending} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
                {pending ? 'جاري الحفظ...' : 'حفظ التعديلات ✅'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Course Card */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>إضافة كورس جديد</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>عنوان الكورس</Label>
            <Input 
              placeholder="مثال: الكورس التأسيسي في البرمجة"
              value={form.title} 
              onChange={(e) => setForm({ ...form, title: e.target.value })} 
            />
          </div>
          <div>
            <Label>المدة (ساعات)</Label>
            <Input type="number" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })} />
          </div>
          
          <div className="sm:col-span-2 space-y-3">
            <Label className="font-bold">صورة الكورس / البوستر (Thumbnail)</Label>
            
            {/* File Upload from PC */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow hover:from-blue-500 hover:to-cyan-500 transition">
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
                        const base64 = event.target?.result as string;
                        setForm({ ...form, thumbnail_url: base64 });
                        toast.success('تم اختيار الصورة بنجاح');
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              <span className="text-xs text-slate-400">أو اكتب رابط الصورة مباشرة:</span>
            </div>

            <Input 
              placeholder="مثال: /images/course-foundation-languages.jpg أو رابط صورة مباشر"
              value={form.thumbnail_url} 
              onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} 
              className="text-xs"
            />

            {/* Thumbnail Preview */}
            {form.thumbnail_url && (
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <div className="relative h-20 w-32 shrink-0 rounded-xl overflow-hidden border border-blue-500/30 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={form.thumbnail_url} 
                    alt="معاينة صورة الكورس" 
                    className="h-full w-full object-cover" 
                  />
                </div>
                <div className="text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">معاينة غلاف الكورس الحالي</p>
                  <p className="text-slate-500">ستظهر هذه الصورة للطلاب كبوستر رئيسي للكورس</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>نماذج جاهزة سريعة:</span>
              <button 
                type="button" 
                onClick={() => setForm({ ...form, thumbnail_url: '/images/course-foundation-languages.jpg' })}
                className="text-blue-600 hover:underline font-semibold"
              >
                بوستر اللغات الجديد
              </button>
              <span>•</span>
              <button 
                type="button" 
                onClick={() => setForm({ ...form, thumbnail_url: '/images/teacher-hero.jpg' })}
                className="text-blue-600 hover:underline font-semibold"
              >
                بوستر المستر مع الروبوت
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <Label>الوصف</Label>
            <Textarea 
              placeholder="اكتب نبذة ومحاور الكورس..."
              value={form.description} 
              onChange={(e) => setForm({ ...form, description: e.target.value })} 
            />
          </div>
          <div>
            <Label>السعر (ج.م)</Label>
            <Input type="number" disabled={form.is_free} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
              <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
              كورس مجاني
            </label>
            <Button onClick={onCreate} disabled={pending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6">
              {pending ? 'جاري الإنشاء...' : 'إضافة الكورس'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Courses List */}
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>الكورسات الحالية ({courses.length})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
          {courses.map((c: any) => (
            <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-3 min-w-0">
                {c.thumbnail_url && (
                  <div className="relative h-14 w-24 shrink-0 rounded-xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900 dark:text-white text-base">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.is_free ? 'مجاني 🎁' : `${c.price} ج.م`} • {c.duration_hours || 0} ساعات
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={c.is_published ? 'success' : 'warning'}>
                  {c.is_published ? 'منشور علناً' : 'مسودة'}
                </Badge>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setEditingCourse(c)}
                  className="rounded-xl border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-cyan-400"
                >
                  <Edit3 className="h-4 w-4 ms-1" />
                  تعديل
                </Button>

                <Button size="sm" variant="outline" onClick={() => toggle(c.id, !c.is_published)} className="rounded-xl">
                  {c.is_published ? 'إخفاء' : 'نشر'}
                </Button>

                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onDelete(c.id, c.title)}
                  className="rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-900"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

