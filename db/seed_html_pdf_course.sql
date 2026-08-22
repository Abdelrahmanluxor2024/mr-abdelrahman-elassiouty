-- ====================================================================
-- 🎓 إنشاء كورس لغة HTML والويب بـ PDF وامتحان كود واختياري (150 ج.م)
-- ====================================================================

DO 
DECLARE
  v_course_id UUID := '77777777-7777-7777-7777-777777777777';
  v_lesson_id UUID := '77777777-aaaa-7777-aaaa-777777777777';
  v_exam_id   UUID := '77777777-eeee-7777-eeee-777777777777';
BEGIN
  -- 1. الكورس بسعر 150 ج.م
  INSERT INTO courses (
    id, title, description, price, is_free, duration_hours, lessons_count, is_published, thumbnail_url, created_at
  ) VALUES (
    v_course_id,
    'كورس تصميم وتطوير المواقع ولغة HTML الشامل 2027',
    'كورس تدريبي مكثف يشمل المذكرة والمستند التدريبي بصيغة PDF مع امتحان تطبيقي متقدم لكتابة الأكواد والبرمجة مع مستر عبدالرحمن الأسيوطي.',
    150.00,
    false,
    6,
    1,
    true,
    '/images/course-foundation-languages.jpg',
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    price = 150.00,
    is_free = false,
    thumbnail_url = EXCLUDED.thumbnail_url,
    is_published = true;

  -- 2. المحاضرة (PDF + امتحان فقط)
  INSERT INTO lessons (
    id, course_id, title, description, video_url, video_duration, has_exam, has_homework, pdf_url, order_index, is_free_preview, created_at
  ) VALUES (
    v_lesson_id,
    v_course_id,
    'المحاضرة الشاملة: أساسيات لغة HTML وهيكلة صفحات الويب والمستند البرمجي',
    'تتضمن هذه المحاضرة المذكرة والمستند التدريبي الكامل بصيغة PDF، يليه الامتحان الشامل لكتابة وتطبيق أكواد HTML.',
    NULL,
    0,
    true,
    false,
    'https://drive.google.com/file/d/1yKxAZcTlu8YNRgs7P5NnxcBUnkhF82QP/view?usp=sharing',
    1,
    false,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET 
    pdf_url = 'https://drive.google.com/file/d/1yKxAZcTlu8YNRgs7P5NnxcBUnkhF82QP/view?usp=sharing',
    has_exam = true;

  -- 3. الامتحان (50 درجة - النجاح من 25 درجة = 50%)
  INSERT INTO exams (id, lesson_id, title, description, duration_minutes, total_marks, passing_marks, max_attempts, is_active, created_at)
  VALUES (v_exam_id, v_lesson_id, 'الامتحان الشامل: أساسيات HTML وكتابة الأكواد', 'امتحان تفاعلي يحتوي على أسئلة كتابة كود برمجية وأسئلة اختيار من متعدد. درجة النجاح 50%.', 30, 50, 25, 2, true, NOW())
  ON CONFLICT (id) DO UPDATE SET is_active = true, total_marks = 50, passing_marks = 25;

  -- حذف أي أسئلة سابقة لإعادة البناء بدقة
  DELETE FROM questions WHERE exam_id = v_exam_id;

  -- 4. أسئلة الامتحان: 2 سؤال كتابة كود مقالي + 7 أسئلة اختيار من متعدد (المجموع 9 أسئلة)

  -- [سؤال 1 - كتابة كود مقالي]
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES (
    v_exam_id,
    '💻 [كتابة كود HTML]: اكتب الهيكل الأساسي الكامل لصفحة HTML5 تحتوي على عنوان الصفحة في التاب "موقعي الأول"، وداخل الجسم عنوان رئيسي (h1) باسم "مرحباً بكم في منصة مستر عبدالرحمن الأسيوطي" وفقرة نصية (p) وزر (button) باسم "اضغط هنا".',
    'essay',
    10,
    'code',
    '[]'::jsonb,
    '<!DOCTYPE html><html><head><title>موقعي الأول</title></head><body><h1>مرحباً بكم في منصة مستر عبدالرحمن الأسيوطي</h1><p>نص تجريبي</p><button>اضغط هنا</button></body></html>',
    'يجب كتابة doctype html ثم head مع title ثم body مع h1 و p و button.',
    1
  );

  -- [سؤال 2 - كتابة كود مقالي]
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES (
    v_exam_id,
    '💻 [كتابة كود HTML]: اكتب كود إنشاء نموذج تسجيل دخول (form) يحتوي على: حقل لإدخال البريد الإلكتروني (type="email")، حقل لكلمة المرور (type="password")، وزر إرسال (type="submit") باسم "تسجيل الدخول".',
    'essay',
    10,
    'code',
    '[]'::jsonb,
    '<form><input type="email" placeholder="البريد"><input type="password" placeholder="كلمة المرور"><button type="submit">تسجيل الدخول</button></form>',
    'استخدام وسم form مع عناصر input للبريد وكلمة المرور وزر submit.',
    2
  );

  -- [سؤال 3 - MCQ]
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES (
    v_exam_id,
    'ما هو الوسم الصحيح المستخدم لإنشاء رابط تشعبي (Hyperlink) في لغة HTML؟',
    'mcq',
    4,
    'html_basics',
    '[
      {"key":"a","text":"<a href=\"url\">رابط</a>"},
      {"key":"b","text":"<link src=\"url\">رابط</link>"},
      {"key":"c","text":"<href url=\"link\">رابط</href>"},
      {"key":"d","text":"<url>رابط</url>"}
    ]'::jsonb,
    'a',
    'الوسم <a> مع الخاصية href هو الوسم القياسي للروابط في HTML.',
    3
  );

  -- [سؤال 4 - MCQ]
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES (
    v_exam_id,
    'ما هي الخاصية المستخدمة لتحديد مسار الصورة البديل في وسم <img> عند عدم ظهورها؟',
    'mcq',
    4,
    'html_basics',
    '[
      {"key":"a","text":"src"},
      {"key":"b","text":"alt"},
      {"key":"c","text":"title"},
      {"key":"d","text":"path"}
    ]'::jsonb,
    'b',
    'الخاصية alt توفر النص البديل للصور.',
    4
  );

  -- [سؤال 5 - MCQ]
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES (
    v_exam_id,
    'أي من الوسوم التالية يُستخدم لإنشاء قائمة مرتبة ومرقمة (Ordered List)؟',
    'mcq',
    4,
    'html_basics',
    '[
      {"key":"a","text":"<ul>"},
      {"key":"b","text":"<ol>"},
      {"key":"c","text":"<li>"},
      {"key":"d","text":"<list>"}
    ]'::jsonb,
    'b',
    'الوسم <ol> يُنشئ قائمة مرتبة بأرقام 1, 2, 3...',
    5
  );

  -- [سؤال 6 - MCQ]
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES (
    v_exam_id,
    'ما هو الوسم الذي يُستخدم لإدراج سطر جديد ونزول للسطر التالي دون إنشاء فقرة جديدة؟',
    'mcq',
    4,
    'html_basics',
    '[
      {"key":"a","text":"<break>"},
      {"key":"b","text":"<br>"},
      {"key":"c","text":"<lb>"},
      {"key":"d","text":"<newline>"}
    ]'::jsonb,
    'b',
    'الوسم <br> يُستخدم لكسر السطر (line break).',
    6
  );

  -- [سؤال 7 - MCQ]
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES (
    v_exam_id,
    'أين يجب وضع وسم <title> في بنية مستند HTML؟',
    'mcq',
    4,
    'html_basics',
    '[
      {"key":"a","text":"داخل وسم <body>"},
      {"key":"b","text":"داخل وسم <head>"},
      {"key":"c","text":"داخل وسم <footer>"},
      {"key":"d","text":"خارج وسم <html>"}
    ]'::jsonb,
    'b',
    'وسم <title> يوضع دائماً داخل وسم <head>.',
    7
  );

  -- [سؤال 8 - MCQ]
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES (
    v_exam_id,
    'ما هو الوسم الصحيح لإنشاء جدول في HTML وتعريف صف وعمود بداخله؟',
    'mcq',
    5,
    'html_basics',
    '[
      {"key":"a","text":"<table> مع <tr> للصف و <td> للخلية"},
      {"key":"b","text":"<table> مع <row> للصف و <col> للخلية"},
      {"key":"c","text":"<grid> مع <grid-row> و <grid-col>"},
      {"key":"d","text":"<tab> مع <t-row> و <t-col>"}
    ]'::jsonb,
    'a',
    'الهيكل القياسي للجداول في HTML هو <table> <tr> <td>.',
    8
  );

  -- [سؤال 9 - MCQ]
  INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index)
  VALUES (
    v_exam_id,
    'ما هو تصريح نوع المستند (DOCTYPE) القياسي في HTML5؟',
    'mcq',
    5,
    'html_basics',
    '[
      {"key":"a","text":"<!DOCTYPE html>"},
      {"key":"b","text":"<!DOCTYPE HTML5>"},
      {"key":"c","text":"<doctype html public>"},
      {"key":"d","text":"<?xml version=\"1.0\"?>"}
    ]'::jsonb,
    'a',
    'في HTML5 الإعلان البسيط المعتمد هو <!DOCTYPE html>.',
    9
  );

END ;
