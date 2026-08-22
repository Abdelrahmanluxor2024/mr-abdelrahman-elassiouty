-- ====================================================================
-- 🎓 إنشاء كورس متكامل بـ 3 دروس وامتحانات مرتبة بتسلسل إجباري
-- ====================================================================

DO $$
DECLARE
  v_course_id UUID := '11111111-2222-3333-4444-555555555555';
  v_lesson1_id UUID := 'aaaa1111-1111-1111-1111-111111111111';
  v_lesson2_id UUID := 'bbbb2222-2222-2222-2222-222222222222';
  v_lesson3_id UUID := 'cccc3333-3333-3333-3333-333333333333';
  v_exam1_id   UUID := 'eeee1111-1111-1111-1111-111111111111';
  v_exam2_id   UUID := 'eeee2222-2222-2222-2222-222222222222';
  v_exam3_id   UUID := 'eeee3333-3333-3333-3333-333333333333';
BEGIN
  -- 1. الكورس
  INSERT INTO courses (
    id, title, description, price, is_free, duration_hours, lessons_count, is_published, thumbnail_url, created_at
  ) VALUES (
    v_course_id,
    'كورس بايثون والذكاء الاصطناعي الشامل 2027 (نظام التتابع الإجباري)',
    'كورس تعليمي متقدم مبني على نظام التتابع: يجب عليك إنهاء كل درس واجتياز امتحانه بنجاح لتتمكن من الانتقال للدرس التالي.',
    50.00,
    false,
    8,
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

  -- 2. المحاضرة 1 (مفتوحة للمشتركين)
  INSERT INTO lessons (
    id, course_id, title, description, video_url, video_duration, has_exam, has_homework, order_index, is_free_preview, created_at
  ) VALUES (
    v_lesson1_id,
    v_course_id,
    'المحاضرة الأولى: المفاهيم الأساسية والمتغيرات في بايثون',
    'البداية مع مستر عبدالرحمن: التعرف على بيئة العمل والمتغيرات وأنواع البيانات.',
    'https://player.vimeo.com/video/1214888390?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479',
    1800,
    true,
    false,
    1,
    false,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET video_url = EXCLUDED.video_url, has_exam = true;

  -- امتحان المحاضرة 1
  INSERT INTO exams (id, lesson_id, title, description, duration_minutes, total_marks, passing_marks, max_attempts, is_active, created_at)
  VALUES (v_exam1_id, v_lesson1_id, 'امتحان المحاضرة 1: المتغيرات والطباعة', 'يجب اجتياز هذا الامتحان لفتح المحاضرة الثانية', 15, 20, 12, 1, true, NOW())
  ON CONFLICT (id) DO UPDATE SET is_active = true, total_marks = 20, passing_marks = 12;

  DELETE FROM questions WHERE exam_id = v_exam1_id;
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES
  (
    v_exam1_id,
    'ما هي وظيفة الأمر print() في لغة بايثون؟',
    'mcq',
    10,
    'basics',
    '[{"key": "A", "text": "عرض وطباعة المخرجات على الشاشة"}, {"key": "B", "text": "حذف المتغيرات"}, {"key": "C", "text": "قفل البرنامج"}]'::jsonb,
    'A',
    'يستخدم print لإظهار النتائج.',
    1
  ),
  (
    v_exam1_id,
    'أي نوع بيانات يمثل الأرقام الصحيحة في بايثون؟',
    'mcq',
    10,
    'basics',
    '[{"key": "A", "text": "int"}, {"key": "B", "text": "str"}, {"key": "C", "text": "float"}]'::jsonb,
    'A',
    'int يمثل الأعداد الصحيحة.',
    2
  );

  -- 3. المحاضرة 2 (مقفلة حتى اجتياز امتحان 1)
  INSERT INTO lessons (
    id, course_id, title, description, video_url, video_duration, has_exam, has_homework, order_index, is_free_preview, created_at
  ) VALUES (
    v_lesson2_id,
    v_course_id,
    'المحاضرة الثانية: الشروط واتخاذ القرار (if, elif, else)',
    'تعلم كيفية كتابة المنطق البرمجي واتخاذ القرارات الذكية بناءً على الشروط.',
    'https://player.vimeo.com/video/1214888390?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479',
    2400,
    true,
    false,
    2,
    false,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET video_url = EXCLUDED.video_url, has_exam = true;

  -- امتحان المحاضرة 2
  INSERT INTO exams (id, lesson_id, title, description, duration_minutes, total_marks, passing_marks, max_attempts, is_active, created_at)
  VALUES (v_exam2_id, v_lesson2_id, 'امتحان المحاضرة 2: الشروط والمنطق البرمجي', 'يجب اجتياز هذا الامتحان لفتح المحاضرة الثالثة', 15, 20, 12, 1, true, NOW())
  ON CONFLICT (id) DO UPDATE SET is_active = true, total_marks = 20, passing_marks = 12;

  DELETE FROM questions WHERE exam_id = v_exam2_id;
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES
  (
    v_exam2_id,
    'ما هي الكلمة المفتاحية لاختبار شرط بديل في بايثون؟',
    'mcq',
    10,
    'conditions',
    '[{"key": "A", "text": "elif"}, {"key": "B", "text": "else if"}, {"key": "C", "text": "elseif"}]'::jsonb,
    'A',
    'في بايثون نستخدم elif.',
    1
  ),
  (
    v_exam2_id,
    'ماذا تعني العلامة == في بايثون؟',
    'mcq',
    10,
    'conditions',
    '[{"key": "A", "text": "المقارنة بين قيمتين للتحقق من التساوي"}, {"key": "B", "text": "تعيين قيمة لمتغير"}, {"key": "C", "text": "الجمع"}]'::jsonb,
    'A',
    'علامة == للمقارنة.',
    2
  );

  -- 4. المحاضرة 3 (مقفلة حتى اجتياز امتحان 2)
  INSERT INTO lessons (
    id, course_id, title, description, video_url, video_duration, has_exam, has_homework, order_index, is_free_preview, created_at
  ) VALUES (
    v_lesson3_id,
    v_course_id,
    'المحاضرة الثالثة: التكرار والحلقات البرمجية (For & While Loops)',
    'إتقان تكرار العمليات البرمجية وبناء أول خوارزمية ذكية.',
    'https://player.vimeo.com/video/1214888390?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479',
    2100,
    true,
    false,
    3,
    false,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET video_url = EXCLUDED.video_url, has_exam = true;

  -- امتحان المحاضرة 3
  INSERT INTO exams (id, lesson_id, title, description, duration_minutes, total_marks, passing_marks, max_attempts, is_active, created_at)
  VALUES (v_exam3_id, v_lesson3_id, 'امتحان المحاضرة 3: حلقات التكرار الشامل', 'الامتحان النهائي للكورس', 15, 20, 12, 1, true, NOW())
  ON CONFLICT (id) DO UPDATE SET is_active = true, total_marks = 20, passing_marks = 12;

  DELETE FROM questions WHERE exam_id = v_exam3_id;
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES
  (
    v_exam3_id,
    'ما هي الدالة المستخدمة لتوليد سلسلة أرقام داخل حلقة for؟',
    'mcq',
    10,
    'loops',
    '[{"key": "A", "text": "range()"}, {"key": "B", "text": "loop()"}, {"key": "C", "text": "count()"}]'::jsonb,
    'A',
    'تستخدم range لتوليد تسلسل أرقام.',
    1
  ),
  (
    v_exam3_id,
    'كيف نخرج من حلقة التكرار فوراً قبل اكتمالها؟',
    'mcq',
    10,
    'loops',
    '[{"key": "A", "text": "break"}, {"key": "B", "text": "continue"}, {"key": "C", "text": "exit"}]'::jsonb,
    'A',
    'أمر break ينهي التكرار فوراً.',
    2
  );

END $$;
