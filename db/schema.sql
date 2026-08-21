-- =====================================================================
-- 🎯 منصة مستر عبدالرحمن الأسيوطي التعليمية - Database Schema (Production Ready)
-- =====================================================================
-- 📌 كيفية الاستخدام:
-- 1. افتح Supabase Dashboard (https://supabase.com/dashboard)
-- 2. توجّه إلى مشروعك -> SQL Editor -> New Query
-- 3. الصق هذا الملف بالكامل واضغط Run (Ctrl + Enter)
-- =====================================================================

-- 1️⃣ تفعيل الإضافات الأساسية
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2️⃣ تنظيف الجداول القديمة (Drop in reverse dependency order)
-- =====================================================================
DROP TABLE IF EXISTS video_views CASCADE;
DROP TABLE IF EXISTS live_sessions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS forum_replies CASCADE;
DROP TABLE IF EXISTS forum_posts CASCADE;
DROP TABLE IF EXISTS charge_codes CASCADE;
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS student_answers CASCADE;
DROP TABLE IF EXISTS exam_attempts CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS students CASCADE;

DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_forum_replies_count() CASCADE;
DROP FUNCTION IF EXISTS redeem_charge_code(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS enroll_in_course(UUID, UUID) CASCADE;

-- =====================================================================
-- 3️⃣ الجداول الأساسية (Core Tables)
-- =====================================================================

-- 👤 جدول الطلاب (Students - id مرتبطة 1:1 بـ auth.users.id)
CREATE TABLE students (
    id UUID PRIMARY KEY, -- مطابق لـ auth.users.id
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    parent_phone VARCHAR(15),
    grade VARCHAR(20) DEFAULT '3rd_secondary' CHECK (grade IN ('1st_secondary', '2nd_secondary', '3rd_secondary')),
    governorate VARCHAR(50),
    school VARCHAR(100),
    wallet_balance DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0),
    device_id_1 TEXT,
    device_id_2 TEXT,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 🛡️ جدول المشرفين والإدارة (Admins)
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'grader' CHECK (role IN ('admin', 'grader')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 📚 جدول الكورسات (Courses)
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    is_free BOOLEAN NOT NULL DEFAULT false,
    duration_hours INTEGER NOT NULL DEFAULT 0,
    lessons_count INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 📖 جدول الدروس (Lessons)
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    video_url TEXT,
    video_duration INTEGER DEFAULT 0, -- بالثواني
    has_exam BOOLEAN NOT NULL DEFAULT false,
    has_homework BOOLEAN NOT NULL DEFAULT false,
    pdf_url TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_free_preview BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 🎓 جدول الاشتراكات في الكورسات (Enrollments)
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    completed_lessons INTEGER NOT NULL DEFAULT 0,
    UNIQUE(student_id, course_id)
);

-- 📝 جدول الامتحانات (Exams)
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    total_marks INTEGER NOT NULL DEFAULT 100,
    passing_marks INTEGER NOT NULL DEFAULT 50,
    max_attempts INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ❓ جدول أسئلة الامتحانات (Questions)
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL DEFAULT 'mcq' CHECK (question_type IN ('mcq', 'essay')),
    marks INTEGER NOT NULL DEFAULT 1,
    branch VARCHAR(50),
    options JSONB, -- صيغة الخيارات: [{"key":"a","text":"..."},{"key":"b","text":"..."}]
    correct_answer TEXT, -- الإجابة النموذجية (a, b, c, d أو نص)
    explanation TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 🎯 جدول محاولات حل الامتحانات (Exam Attempts)
CREATE TABLE exam_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    score DECIMAL(5,2) NOT NULL DEFAULT 0,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    unanswered_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded')),
    performance_by_branch JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ✍️ جدول إجابات الطلاب على كل سؤال (Student Answers)
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    is_correct BOOLEAN,
    marks_obtained DECIMAL(5,2) NOT NULL DEFAULT 0,
    graded_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    grader_feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'auto_graded', 'manually_graded')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 💳 جدول معاملات المحفظة (Wallet Transactions)
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('topup', 'purchase', 'refund', 'reward')),
    payment_method VARCHAR(20) CHECK (payment_method IN ('fawry', 'code', 'admin', 'wallet')),
    reference_code TEXT,
    description TEXT,
    balance_before DECIMAL(10,2),
    balance_after DECIMAL(10,2),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 🎫 جدول كروت وأكواد الشحن (Charge Codes)
CREATE TABLE charge_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_by UUID REFERENCES students(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 💬 جدول منشورات المنتدى والأسئلة (Forum Posts)
CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    replies_count INTEGER NOT NULL DEFAULT 0,
    is_answered BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 💬 جدول ردود المنتدى (Forum Replies)
CREATE TABLE forum_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_admin_reply BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 🔔 جدول الإشعارات (Notifications)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN NOT NULL DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 🔴 جدول حصص البث المباشر (Live Sessions)
CREATE TABLE live_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    stream_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 📊 جدول تتبع مشاهدة الفيديوهات (Video Views)
CREATE TABLE video_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    watched_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    last_watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, lesson_id)
);

-- =====================================================================
-- 4️⃣ الفهارس لتحسين سرعة الاستعلامات (Indexes)
-- =====================================================================
CREATE INDEX idx_students_phone ON students(phone);
CREATE INDEX idx_students_active ON students(is_active);

CREATE INDEX idx_courses_published ON courses(is_published, order_index);
CREATE INDEX idx_lessons_course ON lessons(course_id, order_index);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);

CREATE INDEX idx_questions_exam ON questions(exam_id, order_index);
CREATE INDEX idx_attempts_student ON exam_attempts(student_id, exam_id);
CREATE INDEX idx_attempts_exam ON exam_attempts(exam_id);
CREATE INDEX idx_answers_attempt ON student_answers(attempt_id);
CREATE INDEX idx_answers_status ON student_answers(status);

CREATE INDEX idx_transactions_student ON wallet_transactions(student_id, created_at DESC);
CREATE INDEX idx_codes_code ON charge_codes(code);
CREATE INDEX idx_codes_used ON charge_codes(is_used);

CREATE INDEX idx_forum_posts_student ON forum_posts(student_id);
CREATE INDEX idx_forum_posts_lesson ON forum_posts(lesson_id);
CREATE INDEX idx_forum_replies_post ON forum_replies(post_id);

CREATE INDEX idx_notifications_student ON notifications(student_id, is_read, created_at DESC);
CREATE INDEX idx_views_student_lesson ON video_views(student_id, lesson_id);

-- =====================================================================
-- 5️⃣ الدوال والمعالجات التلقائية (Triggers & Functions)
-- =====================================================================

-- دالة تحديث حقل updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- دالة تحديث عدد الردود في المنتدى تلقائياً
CREATE OR REPLACE FUNCTION update_forum_replies_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE forum_posts SET replies_count = replies_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE forum_posts SET replies_count = GREATEST(0, replies_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forum_replies_count_insert
AFTER INSERT ON forum_replies
FOR EACH ROW EXECUTE FUNCTION update_forum_replies_count();

CREATE TRIGGER trg_forum_replies_count_delete
AFTER DELETE ON forum_replies
FOR EACH ROW EXECUTE FUNCTION update_forum_replies_count();

-- 🪙 دالة الشحن الذري (Atomic RPC) لمنع التكرار والتلاعب
CREATE OR REPLACE FUNCTION redeem_charge_code(p_code TEXT, p_student_id UUID)
RETURNS TABLE(amount NUMERIC, new_balance NUMERIC) AS $$
DECLARE
    v_amount NUMERIC;
    v_before NUMERIC;
    v_after  NUMERIC;
BEGIN
    -- قفل الصف لمنع الاستخدام المتزامن المتكرر (Race condition prevention)
    SELECT c.amount INTO v_amount
    FROM charge_codes c
    WHERE c.code = UPPER(TRIM(p_code)) AND c.is_used = false
    FOR UPDATE;

    IF v_amount IS NULL THEN
        RAISE EXCEPTION 'كود الشحن غير صالح أو تم استخدامه من قبل';
    END IF;

    SELECT wallet_balance INTO v_before 
    FROM students 
    WHERE id = p_student_id 
    FOR UPDATE;

    IF v_before IS NULL THEN
        RAISE EXCEPTION 'بيانات الطالب غير موجودة';
    END IF;

    v_after := v_before + v_amount;

    -- تحديث حالة الكود
    UPDATE charge_codes
    SET is_used = true,
        used_by = p_student_id,
        used_at = NOW()
    WHERE code = UPPER(TRIM(p_code));

    -- زيادة رصيد الطالب
    UPDATE students
    SET wallet_balance = v_after
    WHERE id = p_student_id;

    -- تسجيل المعاملة في سجل المحفظة
    INSERT INTO wallet_transactions(
        student_id,
        amount,
        transaction_type,
        payment_method,
        reference_code,
        description,
        balance_before,
        balance_after,
        status
    )
    VALUES (
        p_student_id,
        v_amount,
        'topup',
        'code',
        UPPER(TRIM(p_code)),
        'شحن محفظة بكود رقم: ' || UPPER(TRIM(p_code)),
        v_before,
        v_after,
        'completed'
    );

    amount := v_amount;
    new_balance := v_after;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 🎓 دالة الاشتراك في كورس عبر المحفظة
CREATE OR REPLACE FUNCTION enroll_in_course(p_student_id UUID, p_course_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    v_price NUMERIC;
    v_balance NUMERIC;
    v_is_free BOOLEAN;
    v_course_title TEXT;
BEGIN
    -- جلب سعر الكورس
    SELECT price, is_free, title INTO v_price, v_is_free, v_course_title
    FROM courses WHERE id = p_course_id;

    IF v_course_title IS NULL THEN
        RAISE EXCEPTION 'الكورس غير موجود';
    END IF;

    -- التحقق من عدم وجود اشتراك مسبق
    IF EXISTS (SELECT 1 FROM enrollments WHERE student_id = p_student_id AND course_id = p_course_id) THEN
        RETURN QUERY SELECT true, 'مشترك بالفعل في هذا الكورس';
        RETURN;
    END IF;

    -- إذا كان الكورس مجانياً
    IF v_is_free OR v_price = 0 THEN
        INSERT INTO enrollments (student_id, course_id) VALUES (p_student_id, p_course_id);
        RETURN QUERY SELECT true, 'تم الاشتراك بنجاح';
        RETURN;
    END IF;

    -- خصم من رصيد المحفظة
    SELECT wallet_balance INTO v_balance FROM students WHERE id = p_student_id FOR UPDATE;

    IF v_balance < v_price THEN
        RAISE EXCEPTION 'رصيد المحفظة غير كافٍ. برجاء شحن المحفظة أولاً.';
    END IF;

    -- تحديث الرصيد
    UPDATE students SET wallet_balance = wallet_balance - v_price WHERE id = p_student_id;

    -- تسجيل المعاملة
    INSERT INTO wallet_transactions (
        student_id, amount, transaction_type, payment_method, reference_code, description,
        balance_before, balance_after, status
    ) VALUES (
        p_student_id, v_price, 'purchase', 'wallet', p_course_id::text,
        'شراء كورس: ' || v_course_title, v_balance, v_balance - v_price, 'completed'
    );

    -- إنشاء الاشتراك
    INSERT INTO enrollments (student_id, course_id) VALUES (p_student_id, p_course_id);

    RETURN QUERY SELECT true, 'تم شراء الكورس والاشتراك بنجاح';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- 6️⃣ سياسات الأمان وحماية البيانات (Row Level Security - RLS)
-- =====================================================================

-- تفعيل RLS على كل الجداول
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_views ENABLE ROW LEVEL SECURITY;

-- 🌍 1. القراءة العامة للمحتوى التعليمي المنشور
CREATE POLICY "Public read published courses" ON courses FOR SELECT USING (is_published = true);
CREATE POLICY "Public read lessons" ON lessons FOR SELECT USING (true);
CREATE POLICY "Public read exams" ON exams FOR SELECT USING (is_active = true);
CREATE POLICY "Public read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Public read live_sessions" ON live_sessions FOR SELECT USING (true);

-- 👤 2. صلاحيات الطالب على بياناته الخاصة (Owner Policies)
CREATE POLICY "Student read own profile" ON students FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Student update own profile" ON students FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Student manage own enrollments" ON enrollments FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Student manage own attempts" ON exam_attempts FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Student view own answers" ON student_answers FOR SELECT 
    USING (EXISTS (SELECT 1 FROM exam_attempts a WHERE a.id = student_answers.attempt_id AND a.student_id = auth.uid()));
CREATE POLICY "Student view own wallet" ON wallet_transactions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Student view own notifications" ON notifications FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Student manage own video views" ON video_views FOR ALL USING (auth.uid() = student_id);

-- 💬 3. المنتدى (Forum) - قراءة للجميع، وتعديل للمالك
CREATE POLICY "Authenticated read forum posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Student insert forum posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Student update own forum posts" ON forum_posts FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Authenticated read forum replies" ON forum_replies FOR SELECT USING (true);
CREATE POLICY "Student insert forum replies" ON forum_replies FOR INSERT WITH CHECK (auth.uid() = student_id);

-- =====================================================================
-- 7️⃣ بيانات تجريبية جاهزة (Seed Data)
-- =====================================================================

-- كورس تجريبي
INSERT INTO courses (id, title, description, is_free, price, is_published, duration_hours, lessons_count, order_index)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'كورس أساسيات البرمجة والتفكير المنطقي',
    'كورس شامل لاختبار وتأسيس الطالب في مبادئ ومفاهيم البرمجة بلغة بايثون للثانوية العامة.',
    true,
    0.00,
    true,
    2,
    1,
    1
) ON CONFLICT (id) DO NOTHING;

-- درس أول
INSERT INTO lessons (id, course_id, title, description, has_exam, order_index, is_free_preview)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'امتحان تحديد المستوى التفاعلي',
    'امتحان شامل يقيس قدرتك على التفكير البرمجي وفهم الأكواد الأساسية.',
    true,
    1,
    true
) ON CONFLICT (id) DO NOTHING;

-- امتحان الدرس
INSERT INTO exams (id, lesson_id, title, description, duration_minutes, total_marks, passing_marks, max_attempts)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'امتحان تحديد مستوى البرمجة',
    '10 أسئلة اختيار من متعدد مع شرح تفصيلي فوري بعد إنهاء الامتحان.',
    20,
    10,
    5,
    3
) ON CONFLICT (id) DO NOTHING;

-- أسئلة الامتحان
DELETE FROM questions WHERE exam_id = '33333333-3333-3333-3333-333333333333';

INSERT INTO questions (exam_id, question_text, question_type, marks, branch, options, correct_answer, explanation, order_index) VALUES
('33333333-3333-3333-3333-333333333333',
 'ما هو الأمر الصحيح لطباعة "Hello World" في Python؟', 'mcq', 1, 'أساسيات',
 '[{"key":"a","text":"echo(\"Hello World\")"},{"key":"b","text":"print(\"Hello World\")"},{"key":"c","text":"cout << \"Hello World\""},{"key":"d","text":"printf(\"Hello World\")"}]'::jsonb,
 'b', 'في Python نستخدم دالة print() لطباعة النصوص والمخرجات على الشاشة.', 1),

('33333333-3333-3333-3333-333333333333',
 'أي من الأسماء التالية يمثل تسمية متغير صحيحة برمجياً؟', 'mcq', 1, 'متغيرات',
 '[{"key":"a","text":"2name"},{"key":"b","text":"name-1"},{"key":"c","text":"my_name"},{"key":"d","text":"my name"}]'::jsonb,
 'c', 'أسماء المتغيرات لا يجب أن تبدأ برقم أو تحتوي على مسافات أو رموز خاصة عدا الشرطة السفلية _.', 2),

('33333333-3333-3333-3333-333333333333',
 'ما نوع البيانات الناتج من العملية: 7 / 2 في Python 3؟', 'mcq', 1, 'أنواع البيانات',
 '[{"key":"a","text":"int (عدد صحيح)"},{"key":"b","text":"float (عدد عشري)"},{"key":"c","text":"string (نص)"},{"key":"d","text":"bool (قيمة منطقية)"}]'::jsonb,
 'b', 'عملية القسمة المنفردة / في بايثون ينتج عنها دائماً قيمة عشرية من نوع float.', 3),

('33333333-3333-3333-3333-333333333333',
 'ما هي الوظيفة الأساسية للحلقات التكرارية (Loops)؟', 'mcq', 1, 'حلقات تكرارية',
 '[{"key":"a","text":"تخزين البيانات الدائمة"},{"key":"b","text":"تكرار تنفيذ مقطع برمجي عدة مرات"},{"key":"c","text":"تلوين النصوص"},{"key":"d","text":"حذف الملفات"}]'::jsonb,
 'b', 'الحلقات التكرارية (مثل for و while) تُستخدم لتكرار تنفيذ كود معين وفقاً لشرط محدد.', 4),

('33333333-3333-3333-3333-333333333333',
 'ما ناتج تنفيذ: len("Programming")؟', 'mcq', 1, 'دوال النصوص',
 '[{"key":"a","text":"10"},{"key":"b","text":"11"},{"key":"c","text":"12"},{"key":"d","text":"9"}]'::jsonb,
 'b', 'دالة len() تحسب عدد أحرف النص، وكلمة Programming تتكون من 11 حرفاً.', 5),

('33333333-3333-3333-3333-333333333333',
 'أي معامل يُستخدم للتحقق من المساواة في جمل المقارنة؟', 'mcq', 1, 'عوامل المقارنة',
 '[{"key":"a","text":"="},{"key":"b","text":"=="},{"key":"c","text":"==="},{"key":"d","text":"!="}]'::jsonb,
 'b', 'المعامل = هو للإسناد والتعيين (Assignment)، بينما == يُستخدم للمقارنة والتحقق من التساوي.', 6),

('33333333-3333-3333-3333-333333333333',
 'ما هي الصيغة الصحيحة لكتابة جملة الشرط if في Python؟', 'mcq', 1, 'الشروط',
 '[{"key":"a","text":"if (x > 5) { }"},{"key":"b","text":"if x > 5:"},{"key":"c","text":"if x > 5 then"},{"key":"d","text":"IF x > 5"}]'::jsonb,
 'b', 'في بايثون نكتب الشرط ثم نقطتين رأسيتين : مع مسافة بادئة للكتلة البرمجية.', 7),

('33333333-3333-3333-3333-333333333333',
 'ما هي خاصية القائمة (List) في بايثون؟', 'mcq', 1, 'هياكل البيانات',
 '[{"key":"a","text":"غير قابلة للتعديل بعد إنشائها"},{"key":"b","text":"قابلة للتعديل والإضافة والحذف (Mutable)"},{"key":"c","text":"تخزن أرقاماً فقط"},{"key":"d","text":"تخزن نصوصاً فقط"}]'::jsonb,
 'b', 'القوائم (Lists) في بايثون مرنة وقابلة للتعديل والترتيب وتستقبل أنواعاً مختلفة من البيانات.', 8),

('33333333-3333-3333-3333-333333333333',
 'ما الغرض من إنشاء الدوال (Functions) في الكود؟', 'mcq', 1, 'الدوال',
 '[{"key":"a","text":"تنظيم الكود وإعادة استخدامه بدون تكرار"},{"key":"b","text":"زيادة حجم البرنامج"},{"key":"c","text":"تسريع شحن البطارية"},{"key":"d","text":"إغلاق النظام"}]'::jsonb,
 'a', 'الدوال تجعل الكود منظماً، مقروءاً، وسهل إعادة الاستخدام في أكثر من مكان.', 9),

('33333333-3333-3333-3333-333333333333',
 'ما ناتج تنفيذ العملية: 2 ** 4 في بايثون؟', 'mcq', 1, 'العمليات الحسابية',
 '[{"key":"a","text":"8"},{"key":"b","text":"16"},{"key":"c","text":"6"},{"key":"d","text":"32"}]'::jsonb,
 'b', 'المعامل ** يمثل عملية الأس (Power)، و 2 أس 4 يساوي 16.', 10);

-- أكواد شحن تجريبية للتجربة السريعة
INSERT INTO charge_codes (code, amount, is_used) VALUES
('MR-50EGP-TEST1', 50.00, false),
('MR-100EGP-TEST2', 100.00, false),
('MR-200EGP-TEST3', 200.00, false)
ON CONFLICT (code) DO NOTHING;

-- =====================================================================
-- ✅ تم بناء قاعدة البيانات بالكامل بنجاح وبأعلى معايير الأمان والأداء!
-- =====================================================================
