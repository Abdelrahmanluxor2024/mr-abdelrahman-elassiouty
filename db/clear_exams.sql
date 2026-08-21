-- حذف كافة الامتحانات والمحاولات وإجابات الطلاب من المنصة
DELETE FROM student_answers;
DELETE FROM exam_attempts;
DELETE FROM questions;
DELETE FROM exams;
UPDATE lessons SET has_exam = false;
