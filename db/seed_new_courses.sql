-- =====================================================================
-- 🎯 تحديث الكورسات والامتحانات الجديدة - منصة مستر عبدالرحمن الأسيوطي
-- =====================================================================

-- 1. تنظيف البيانات القديمة من الكورسات والامتحانات
DELETE FROM student_answers;
DELETE FROM exam_attempts;
DELETE FROM questions;
DELETE FROM exams;
DELETE FROM lessons;
DELETE FROM enrollments;
DELETE FROM courses;

-- 2. إدخال الكورس التأسيسي الجديد (لغات - مجاني - 3 دروس كل درس بامتحان)
INSERT INTO courses (
  id,
  title,
  description,
  slug,
  price,
  is_free,
  published,
  thumbnail_url,
  created_at
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'الكورس التأسيسي في البرمجة والذكاء الاصطناعي 2027 | لغات',
  'كورس تأسيسي متكامل لطلاب مدارس اللغات والثانوية العامة، يبدأ معك من الصفر في التفكير المنطقي ولغة بايثون والذكاء الاصطناعي والمشاريع التفاعلية.',
  'foundation-cs-languages-2027',
  0,
  true,
  true,
  '/images/course-foundation-languages.jpg',
  NOW()
);

-- إدخال دروس الكورس التأسيسي (3 دروس)
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  video_url,
  order_index,
  is_free,
  has_exam,
  created_at
) VALUES 
(
  '10000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'الدرس الأول: مقدمة في علوم الحاسب وبيئة بايثون (Intro to Computer Science & Python)',
  'مفاهيم التفكير الحاسوبي، تثبيت وتشغيل بايثون، وكتابة أول سطر برمجي تفاعلي.',
  '<iframe src="https://player.vimeo.com/video/1214888390?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" width="1280" height="720" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" title="الدرس الأول"></iframe>',
  1,
  true,
  true,
  NOW()
),
(
  '10000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'الدرس الثاني: المتغيرات والعمليات الحسابية والمنطقية (Variables & Logic Operations)',
  'التعامل مع أنواع البيانات المختلفة (Integers, Floats, Strings, Booleans) والمدخلات.',
  '<iframe src="https://player.vimeo.com/video/1214888390?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" width="1280" height="720" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" title="الدرس الثاني"></iframe>',
  2,
  true,
  true,
  NOW()
),
(
  '10000000-0000-0000-0000-000000000003',
  '11111111-1111-1111-1111-111111111111',
  'الدرس الثالث: هياكل التحكم وبناء أول مشروع ذكي (Control Flow & AI Project)',
  'الشروط (if/else)، الحلقات التكرارية (Loops)، وبناء أول برنامج يتعرف على مدخلات المستخدم بالذكاء الاصطناعي.',
  '<iframe src="https://player.vimeo.com/video/1214888390?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" width="1280" height="720" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" title="الدرس الثالث"></iframe>',
  3,
  true,
  true,
  NOW()
);

-- إدخال امتحانات الدروس الثلاثة (محاولة واحدة فقط لكل امتحان)
INSERT INTO exams (
  id,
  lesson_id,
  title,
  duration_minutes,
  passing_score,
  max_attempts,
  is_published,
  created_at
) VALUES 
(
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'امتحان الدرس الأول: أساسيات البرمجة وبيئة العمل (Quiz 1)',
  15,
  60,
  1,
  true,
  NOW()
),
(
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'امتحان الدرس الثاني: المتغيرات والعمليات المنطقية (Quiz 2)',
  15,
  60,
  1,
  true,
  NOW()
),
(
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000003',
  'امتحان الدرس الثالث: الشروط وتطبيقات الذكاء الاصطناعي (Quiz 3)',
  20,
  60,
  1,
  true,
  NOW()
);

-- إدخال أسئلة الامتحان الأول
INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, explanation, marks, order_index) VALUES
('20000000-0000-0000-0000-000000000001', 'ما هي الدالة المستخدمة لطباعة النصوص في بايثون؟', 'mcq', '[{"key":"a","text":"print()"},{"key":"b","text":"echo()"},{"key":"c","text":"display()"},{"key":"d","text":"write()"}]'::jsonb, 'a', 'دالة print() هي الدالة القياسية للطباعة وعرض المخرجات في بايثون.', 2, 1),
('20000000-0000-0000-0000-000000000001', 'أي من التالي يُعتبر اسماً صحيحاً لمتغير في بايثون؟', 'mcq', '[{"key":"a","text":"2my_var"},{"key":"b","text":"my_var_2"},{"key":"c","text":"my-var"},{"key":"d","text":"my var"}]'::jsonb, 'b', 'أسماء المتغيرات لا يجب أن تبدأ برقم ولا تحتوي على مسافات أو شرطة عادية.', 2, 2),
('20000000-0000-0000-0000-000000000001', 'ما الامتداد الخاص بملفات لغة بايثون؟', 'mcq', '[{"key":"a","text":".py"},{"key":"b","text":".python"},{"key":"c","text":".pt"},{"key":"d","text":".js"}]'::jsonb, 'a', 'امتداد ملفات بايثون هو .py دائماً.', 2, 3);

-- إدخال أسئلة الامتحان الثاني
INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, explanation, marks, order_index) VALUES
('20000000-0000-0000-0000-000000000002', 'ما نوع البيانات للقيمة True في بايثون؟', 'mcq', '[{"key":"a","text":"Integer"},{"key":"b","text":"String"},{"key":"c","text":"Boolean"},{"key":"d","text":"Float"}]'::jsonb, 'c', 'القيم المنطقية True و False تنتمي لنوع bool (Boolean).', 2, 1),
('20000000-0000-0000-0000-000000000002', 'ما نتيجة العملية 10 // 3 في لغة بايثون؟', 'mcq', '[{"key":"a","text":"3.33"},{"key":"b","text":"3"},{"key":"c","text":"1"},{"key":"d","text":"4"}]'::jsonb, 'b', 'معامل // يقوم بعملية القسمة الصحيحة وتجاهل الكسور (Floor Division).', 2, 2),
('20000000-0000-0000-0000-000000000002', 'أي دالة نستخدمها لتحويل النص إلى رقم صحيح؟', 'mcq', '[{"key":"a","text":"str()"},{"key":"b","text":"int()"},{"key":"c","text":"float()"},{"key":"d","text":"num()"}]'::jsonb, 'b', 'دالة int() تحول القيمة المدخلة إلى رقم صحيح.', 2, 3);

-- إدخال أسئلة الامتحان الثالث
INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, explanation, marks, order_index) VALUES
('20000000-0000-0000-0000-000000000003', 'ما الكلمة المفتاحية المستخدمة لفحص شروط بديلة بعد if؟', 'mcq', '[{"key":"a","text":"elseif"},{"key":"b","text":"elif"},{"key":"c","text":"else if"},{"key":"d","text":"case"}]'::jsonb, 'b', 'في بايثون نستخدم elif كاختصار لـ else if.', 2, 1),
('20000000-0000-0000-0000-000000000003', 'ما المعامل المستخدم للمقارنة والتحقق من التساوي؟', 'mcq', '[{"key":"a","text":"="},{"key":"b","text":"=="},{"key":"c","text":"==="},{"key":"d","text":"equals"}]'::jsonb, 'b', 'المعامل == يُستخدم للتحقق من تساوي قيمتين.', 2, 2),
('20000000-0000-0000-0000-000000000003', 'كيف نكتب تعليقاً بسطر واحد في بايثون؟', 'mcq', '[{"key":"a","text":"// comment"},{"key":"b","text":"/* comment */"},{"key":"c","text":"# comment"},{"key":"d","text":"<!-- comment -->"}]'::jsonb, 'c', 'علامة الهاشتاغ # هي المخصصة للتعليقات في بايثون.', 2, 3);

-- =====================================================================
-- 3. إدخال الكورس الثاني (كورس تجربة بالفلوس - 50 جنيه)
-- =====================================================================
INSERT INTO courses (
  id,
  title,
  description,
  slug,
  price,
  is_free,
  published,
  thumbnail_url,
  created_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'كورس تجربة بالفلوس',
  'كورس تجريبي مدفوع بسعر 50 جنيه لتجربة نظام الاشتراك والمحاضرات المدفوعة وتطبيق الاختبارات.',
  'paid-trial-course-50',
  50,
  false,
  true,
  '/images/teacher-hero.jpg',
  NOW()
);

-- درس للكورس التجريبي
INSERT INTO lessons (
  id,
  course_id,
  title,
  description,
  video_url,
  order_index,
  is_free,
  has_exam,
  created_at
) VALUES (
  '20000000-0000-0000-0000-000000000010',
  '22222222-2222-2222-2222-222222222222',
  'المحاضرة الشاملة: التطبيقات العملية وحل الأسئلة المتقدمة',
  'شرح شامل للمفاهيم المتقدمة مع حل نماذج امتحانات وزارية وتطبيقات بايثون الذكية.',
  '<iframe src="https://player.vimeo.com/video/1214888390?title=0&byline=0&portrait=0&badge=0&autopause=0&player_id=0&app_id=58479" width="1280" height="720" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share" referrerpolicy="strict-origin-when-cross-origin" title="المحاضرة الشاملة"></iframe>',
  1,
  false,
  true,
  NOW()
);

-- امتحان الكورس التجريبي
INSERT INTO exams (
  id,
  lesson_id,
  title,
  duration_minutes,
  passing_score,
  max_attempts,
  is_published,
  created_at
) VALUES (
  '30000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000010',
  'امتحان الكورس التجريبي الشامل (Quiz Trial)',
  25,
  60,
  1,
  true,
  NOW()
);

INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, explanation, marks, order_index) VALUES
('30000000-0000-0000-0000-000000000010', 'ما هو ناتج تنفيذ الكود len(["Python", "AI", "Code"]) ؟', 'mcq', '[{"key":"a","text":"3"},{"key":"b","text":"2"},{"key":"c","text":"6"},{"key":"d","text":"Error"}]'::jsonb, 'a', 'دالة len() ترجع عدد عناصر القائمة (وهي 3 عناصر).', 2, 1),
('30000000-0000-0000-0000-000000000010', 'أي من التالي يُستخدم لإنشاء حلقة تكرارية محددة بعدد مرات؟', 'mcq', '[{"key":"a","text":"for in range()"},{"key":"b","text":"if else"},{"key":"c","text":"def()"},{"key":"d","text":"class"}]'::jsonb, 'a', 'حلقة for مع دالة range() تُستخدم للتكرار عدد محدد من المرات.', 2, 2);

-- =====================================================================
-- 4. كود ترقية حسابك إلى Admin (ضع رقم هاتفك أو بريدك هنا)
-- =====================================================================
UPDATE students 
SET role = 'admin' 
WHERE phone = '01064106070' OR phone = '01267267342';
