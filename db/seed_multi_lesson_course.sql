-- ====================================================================
-- كورس نموذجي متعدد الدروس (3 دروس بامتحان بعد كل درس)
-- كل درس مقفل حتى يجتاز الطالب امتحان الدرس السابق
-- ====================================================================

DO `
DECLARE
  v_course_id UUID := 'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA';
  v_lesson1_id UUID := 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB01';
  v_lesson2_id UUID := 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB02';
  v_lesson3_id UUID := 'BBBBBBBB-BBBB-BBBB-BBBB-BBBBBBBBBB03';
  v_exam1_id UUID := 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCC01';
  v_exam2_id UUID := 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCC02';
  v_exam3_id UUID := 'CCCCCCCC-CCCC-CCCC-CCCC-CCCCCCCCCC03';
BEGIN
  INSERT INTO courses (id, title, description, price, is_free, duration_hours, lessons_count, is_published, thumbnail_url, created_at)
  VALUES (v_course_id, 'كورس الرياضيات الشامل - الثانوية العامة 2026',
    'كورس متكامل لمادة الرياضيات للثانوية العامة يشمل الجبر والهندسة. الدروس بالترتيب - لا يُفتح الدرس التالي إلا بعد اجتياز امتحان الدرس السابق.',
    75.00, false, 4, 3, true, '/images/course-foundation-languages.jpg', NOW())
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, price = 75.00, is_published = true;
END `
