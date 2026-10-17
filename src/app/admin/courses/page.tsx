'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Upload, Sparkles, Edit3, Trash2, X, Check, Loader2, BookOpen, Plus, Video, FileText } from 'lucide-react';
import { where } from 'firebase/firestore';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    price: 0, 
    is_free: true, 
    duration_hours: 0,
    thumbnail_url: '/images/course-foundation-languages.jpg'
  });
  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [pending, setPending] = useState(false);

  // Lessons Management State
  const [managingLessonsCourse, setManagingLessonsCourse] = useState<any | null>(null);
  const [courseLessons, setCourseLessons] = useState<any[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    pdfUrl: '',
    isPdfLocked: true,
    orderIndex: 1
  });
  const [editingLesson, setEditingLesson] = useState<any | null>(null);

  async function loadLessonsForCourse(courseId: string) {
    setLoadingLessons(true);
    try {
      const q = query(collection(db, 'lessons'), where('courseId', '==', courseId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));
      setCourseLessons(list);
      setLessonForm(prev => ({ ...prev, orderIndex: list.length + 1 }));
    } catch (err) {
      console.error('Error loading course lessons:', err);
      toast.error('حدث خطأ أثناء تحميل دروس الكورس');
    } finally {
      setLoadingLessons(false);
    }
  }

  async function openLessonsManager(course: any) {
    setManagingLessonsCourse(course);
    setEditingLesson(null);
    setLessonForm({
      title: '',
      description: '',
      videoUrl: '',
      pdfUrl: '',
      isPdfLocked: true,
      orderIndex: 1
    });
    await loadLessonsForCourse(course.id);
  }

  async function onSaveLesson() {
    if (!managingLessonsCourse) return;
    if (!lessonForm.title.trim()) {
      toast.error('يرجى إدخال عنوان الدرس');
      return;
    }
    setPending(true);
    try {
      if (editingLesson) {
        // Update lesson
        await updateDoc(doc(db, 'lessons', editingLesson.id), {
          title: lessonForm.title.trim(),
          description: lessonForm.description.trim(),
          videoUrl: lessonForm.videoUrl.trim(),
          pdfUrl: lessonForm.pdfUrl.trim(),
          isPdfLocked: Boolean(lessonForm.isPdfLocked),
          orderIndex: Number(lessonForm.orderIndex) || 1
        });
        toast.success('تم تحديث بيانات الدرس بنجاح 🎉');
        setEditingLesson(null);
      } else {
        // Create new lesson
        await addDoc(collection(db, 'lessons'), {
          courseId: managingLessonsCourse.id,
          title: lessonForm.title.trim(),
          description: lessonForm.description.trim(),
          videoUrl: lessonForm.videoUrl.trim(),
          pdfUrl: lessonForm.pdfUrl.trim(),
          isPdfLocked: Boolean(lessonForm.isPdfLocked),
          orderIndex: Number(lessonForm.orderIndex) || (courseLessons.length + 1),
          createdAt: new Date().toISOString()
        });
        toast.success('تمت إضافة الدرس بنجاح إلى الكورس 🎉');
      }

      setLessonForm({
        title: '',
        description: '',
        videoUrl: '',
        pdfUrl: '',
        isPdfLocked: true,
        orderIndex: courseLessons.length + 2
      });
      await loadLessonsForCourse(managingLessonsCourse.id);
    } catch (err: any) {
      console.error('Save lesson error:', err);
      toast.error(err.message || 'حدث خطأ أثناء حفظ الدرس');
    } finally {
      setPending(false);
    }
  }

  async function onDeleteLesson(lessonId: string, title: string) {
    if (!confirm(`هل أنت متأكد من حذف درس "${title}"؟`)) return;
    setPending(true);
    try {
      await deleteDoc(doc(db, 'lessons', lessonId));
      toast.success('تم حذف الدرس بنجاح');
      if (managingLessonsCourse) {
        await loadLessonsForCourse(managingLessonsCourse.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل حذف الدرس');
    } finally {
      setPending(false);
    }
  }

  async function loadCourses() {
    setLoadingCourses(true);
    try {
      const q = query(collection(db, 'courses'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCourses(list);
    } catch (err) {
      console.error('Error loading courses:', err);
      toast.error('حدث خطأ أثناء تحميل الكورسات');
    } finally {
      setLoadingCourses(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function onCreate() {
    if (!form.title.trim()) {
      toast.error('يرجى كتابة عنوان الكورس');
      return;
    }
    setPending(true);
    try {
      await addDoc(collection(db, 'courses'), {
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        is_free: Boolean(form.is_free),
        duration_hours: Number(form.duration_hours) || 0,
        thumbnail_url: form.thumbnail_url || '/images/course-foundation-languages.jpg',
        is_published: true,
        created_at: new Date().toISOString()
      });
      toast.success('تم إنشاء الكورس بنجاح في Firebase 🎉');
      setForm({ 
        title: '', 
        description: '', 
        price: 0, 
        is_free: true, 
        duration_hours: 0,
        thumbnail_url: '/images/course-foundation-languages.jpg'
      });
      await loadCourses();
    } catch (err: any) {
      console.error('Create course error:', err);
      toast.error(err.message || 'حدث خطأ أثناء إنشاء الكورس');
    } finally {
      setPending(false);
    }
  }

  async function onUpdate() {
    if (!editingCourse || !editingCourse.title?.trim()) {
      toast.error('يرجى كتابة عنوان الكورس');
      return;
    }
    setPending(true);
    try {
      const courseRef = doc(db, 'courses', editingCourse.id);
      await updateDoc(courseRef, {
        title: editingCourse.title.trim(),
        description: editingCourse.description || '',
        price: Number(editingCourse.price) || 0,
        is_free: Boolean(editingCourse.is_free),
        duration_hours: Number(editingCourse.duration_hours) || 0,
        thumbnail_url: editingCourse.thumbnail_url || '/images/course-foundation-languages.jpg'
      });
      toast.success('تم تحديث بيانات الكورس بنجاح 🎉');
      setEditingCourse(null);
      await loadCourses();
    } catch (err: any) {
      console.error('Update course error:', err);
      toast.error(err.message || 'حدث خطأ أثناء التحديث');
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string, title: string) {
    if (!confirm(`هل أنت متأكد من حذف كورس "${title}" نهائياً؟`)) return;
    setPending(true);
    try {
      await deleteDoc(doc(db, 'courses', id));
      toast.success('تم حذف الكورس بنجاح');
      await loadCourses();
    } catch (err: any) {
      console.error('Delete course error:', err);
      toast.error(err.message || 'حدث خطأ أثناء حذف الكورس');
    } finally {
      setPending(false);
    }
  }

  async function toggle(id: string, is_published: boolean) {
    try {
      await updateDoc(doc(db, 'courses', id), { is_published });
      toast.success(is_published ? 'تم نشر الكورس' : 'تم إخفاء الكورس');
      await loadCourses();
    } catch (err: any) {
      toast.error(err.message || 'فشل تغيير حالة النشر');
    }
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

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={c.is_published ? 'success' : 'warning'}>
                  {c.is_published ? 'منشور علناً' : 'مسودة'}
                </Badge>

                <Button 
                  size="sm" 
                  onClick={() => openLessonsManager(c)}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-md"
                >
                  <BookOpen className="h-4 w-4 ms-1" />
                  إدارة دروس الكورس ({c.lessonsCount || 'عرض'})
                </Button>
                
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

      {/* ── LESSONS MANAGEMENT MODAL / PANEL ── */}
      {managingLessonsCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-700 bg-[#0B1324] p-6 text-white shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    إدارة وإضافة دروس: {managingLessonsCourse.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    يمكنك إضافة فيديوهات (يوتيوب أو روابط مباشرة) ومذكرات PDF وترتيب المحاضرات
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManagingLessonsCourse(null)}
                className="rounded-full text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Form to Add / Edit Lesson */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-5 space-y-4">
              <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {editingLesson ? 'تعديل بيانات المحاضرة' : 'إضافة محاضرة / درس جديد للكورس'}
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs text-slate-300">عنوان الدرس *</Label>
                  <Input
                    placeholder="مثال: المحاضرة الرابعة: مراجعة عامة وشرح القواعد"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    className="bg-[#070B14] border-slate-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300 flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-amber-400" />
                    رابط الفيديو (YouTube أو رابط مباشر)
                  </Label>
                  <Input
                    placeholder="https://youtu.be/..."
                    dir="ltr"
                    value={lessonForm.videoUrl}
                    onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                    className="bg-[#070B14] border-slate-700 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300 flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5 text-cyan-400" />
                    رابط ملف الـ PDF (المذكرة والتدريبات)
                  </Label>
                  <Input
                    placeholder="https://filebin.net/... أو رابط مباشر للـ PDF"
                    dir="ltr"
                    value={lessonForm.pdfUrl}
                    onChange={(e) => setLessonForm({ ...lessonForm, pdfUrl: e.target.value })}
                    className="bg-[#070B14] border-slate-700 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs text-slate-300">ترتيب الدرس (1, 2, 3...)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={lessonForm.orderIndex}
                    onChange={(e) => setLessonForm({ ...lessonForm, orderIndex: Number(e.target.value) })}
                    className="bg-[#070B14] border-slate-700 text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={lessonForm.isPdfLocked}
                      onChange={(e) => setLessonForm({ ...lessonForm, isPdfLocked: e.target.checked })}
                      className="rounded"
                    />
                    قفل ملف الـ PDF حتى يجتاز الطالب الامتحان
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs text-slate-300">وصف موجز للمحاضرة</Label>
                  <Textarea
                    rows={2}
                    placeholder="نبذة عن ما يتم شرحه في هذه المحاضرة..."
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                    className="bg-[#070B14] border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                {editingLesson && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingLesson(null);
                      setLessonForm({
                        title: '',
                        description: '',
                        videoUrl: '',
                        pdfUrl: '',
                        isPdfLocked: true,
                        orderIndex: courseLessons.length + 1
                      });
                    }}
                    className="rounded-xl border-slate-700 text-slate-300"
                  >
                    إلغاء التعديل
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onSaveLesson}
                  disabled={pending}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-white px-6 shadow"
                >
                  {pending ? 'جاري الحفظ...' : (editingLesson ? 'حفظ تعديلات الدرس ✅' : 'إضافة الدرس للكورس 🚀')}
                </Button>
              </div>
            </div>

            {/* List of Lessons inside course */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400">
                قائمة دروس الكورس الحالية ({courseLessons.length} دروس):
              </h4>

              {loadingLessons ? (
                <div className="text-center py-6 text-slate-500 text-xs">جاري تحميل الدروس...</div>
              ) : courseLessons.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  لا توجد دروس مضافة لهذا الكورس حتى الآن. استخدم النموذج أعلاه لإضافة الدرس الأول!
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {courseLessons.map((l: any, idx: number) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#070B14] p-3 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-blue-600/30 text-cyan-300 text-xs font-black">
                          {l.orderIndex || idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">{l.title}</p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                            {l.videoUrl && <span className="flex items-center gap-1 text-amber-400">🎥 به فيديو</span>}
                            {l.pdfUrl && <span className="flex items-center gap-1 text-cyan-400">📄 به PDF</span>}
                            {l.isPdfLocked && <span className="text-slate-500">🔒 PDF مقفول بالامتحان</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingLesson(l);
                            setLessonForm({
                              title: l.title || '',
                              description: l.description || '',
                              videoUrl: l.videoUrl || '',
                              pdfUrl: l.pdfUrl || '',
                              isPdfLocked: l.isPdfLocked ?? true,
                              orderIndex: l.orderIndex || (idx + 1)
                            });
                          }}
                          className="h-8 w-8 p-0 rounded-lg text-blue-400 hover:bg-blue-950/40"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleteLesson(l.id, l.title)}
                          className="h-8 w-8 p-0 rounded-lg text-red-400 hover:bg-red-950/40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button
                onClick={() => setManagingLessonsCourse(null)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-6"
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

