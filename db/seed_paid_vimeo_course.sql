-- ====================================================================
-- 🎓 إضافة الكورس المدفوع الجديد (50 ج.م) مع فيديو Vimeo والامتحان التفاعلي
-- ====================================================================

DO $$
DECLARE
  v_course_id UUID := '77777777-7777-7777-7777-777777777777';
  v_lesson_id UUID := '88888888-8888-8888-8888-888888888888';
  v_exam_id   UUID := '99999999-9999-9999-9999-999999999999';
BEGIN
  -- 1. إضافة أو تحديث الكورس المدفوع (50 ج.م)
  INSERT INTO courses (
    id, title, description, price, is_free, duration_hours, lessons_count, is_published, thumbnail_url, created_at
  ) VALUES (
    v_course_id,
    'كورس بايثون والذكاء الاصطناعي الشامل 2027',
    'كورس احترافي مكثف يبدأ معك من الصفر في البرمجة وحتى بناء تطبيقات الذكاء الاصطناعي مع مستر عبدالرحمن الأسيوطي.',
    50.00,
    false,
    6,
    3,
    true,
    '/images/course-foundation-languages.jpg',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = 50.00,
    is_free = false,
    thumbnail_url = EXCLUDED.thumbnail_url,
    is_published = true;

  -- 2. إضافة الدرس الأول مع فيديو Vimeo المرفق
  INSERT INTO lessons (
    id, course_id, title, description, video_url, video_duration, has_exam, has_homework, order_index, is_free_preview, created_at
  ) VALUES (
    v_lesson_id,
    v_course_id,
    'المحاضرة الأولى: مقدمة البرمجة والتفكير المنطقي بلغة بايثون',
    'شرح تطبيقي عملي لأساسيات لغة بايثون وكيفية كتابة الأوامر البرمجية الأولى وتشغيل الأكواد.',
    'https://player.vimeo.com/video/1214888390?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479',
    1800,
    true,
    false,
    1,
    false,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    video_url = EXCLUDED.video_url,
    has_exam = true,
    is_free_preview = false;

  -- 3. إضافة امتحان المحاضرة الأولى
  INSERT INTO exams (
    id, lesson_id, title, description, duration_minutes, total_marks, passing_marks, max_attempts, is_active, created_at
  ) VALUES (
    v_exam_id,
    v_lesson_id,
    'امتحان المحاضرة الأولى: أساسيات بايثون والمتغيرات',
    'اختبار تفاعلي لقياس مدى استيعابك للمفاهيم الأساسية للمحاضرة الأولى.',
    20,
    20,
    12,
    1,
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    total_marks = 20,
    passing_marks = 12,
    is_active = true;

  -- 4. مسح الأسئلة القديمة وإضافة 5 أسئلة نموذجية
  DELETE FROM questions WHERE exam_id = v_exam_id;

  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES
  (
    v_exam_id,
    'ما هي وظيفة الدالة print() في لغة بايثون؟',
    'mcq',
    4,
    'python_basics',
    '[
      {"key": "A", "text": "طباعة وعرض النصوص والنتائج على الشاشة"},
      {"key": "B", "text": "قراءة مدخلات من المستخدم"},
      {"key": "C", "text": "حفظ الكود في ملف"},
      {"key": "D", "text": "إيقاف تشغيل البرنامج"}
    ]'::jsonb,
    'A',
    'تستخدم دالة print() لإظهار المخرجات للمستخدم على شاشة الـ Terminal.',
    1
  ),
  (
    v_exam_id,
    'أي من الخيارات التالية يُعد اسماً صحيحاً ومقبولاً لمتغير في بايثون؟',
    'mcq',
    4,
    'python_basics',
    '[
      {"key": "A", "text": "student_age"},
      {"key": "B", "text": "2nd_student"},
      {"key": "C", "text": "student-name"},
      {"key": "D", "text": "class"}
    ]'::jsonb,
    'A',
    'في بايثون، لا يجوز أن يبدأ اسم المتغير برقم، ولا يحتوي على شرطة عادية -، ولا يكون كلمة محجوزة مثل class.',
    2
  ),
  (
    v_exam_id,
    'ما هو ناتج العملية الحسابية 5 + 3 * 2 في بايثون؟',
    'mcq',
    4,
    'python_basics',
    '[
      {"key": "A", "text": "11"},
      {"key": "B", "text": "16"},
      {"key": "C", "text": "10"},
      {"key": "D", "text": "13"}
    ]'::jsonb,
    'A',
    'أولويات العمليات الرياضية تعطي الأولوية للضرب أولاً: 3 * 2 = 6، ثم 5 + 6 = 11.',
    3
  ),
  (
    v_exam_id,
    'ما هو نوع البيانات (Data Type) للقيمة "مستر عبدالرحمن" في لغة بايثون؟',
    'mcq',
    4,
    'python_basics',
    '[
      {"key": "A", "text": "str (String - نص)"},
      {"key": "B", "text": "int (Integer - عدد صحيح)"},
      {"key": "C", "text": "float (Float - عدد عشري)"},
      {"key": "D", "text": "bool (Boolean - منطقي)"}
    ]'::jsonb,
    'A',
    'النصوص المحاطة بعلامات تنصيص في بايثون تنتمي للنوع str (نص).',
    4
  ),
  (
    v_exam_id,
    'كيف نكتب تعليقاً (Comment) من سطر واحد في لغة بايثون؟',
    'mcq',
    4,
    'python_basics',
    '[
      {"key": "A", "text": "باستخدام علامة الشباك #"},
      {"key": "B", "text": "باستخدام علامتي //"},
      {"key": "C", "text": "باستخدام <!-- -->"},
      {"key": "D", "text": "باستخدام كلمة comment"}
    ]'::jsonb,
    'A',
    'تبدأ التعليقات ذات السطر الواحد في بايثون برمز # ويتم تجاهلها بواسطة المترجم.',
    5
  );

END $$;
