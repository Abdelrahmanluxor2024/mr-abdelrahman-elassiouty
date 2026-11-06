"use server";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import {
  validateForumImage,
  type ImageAttachment,
} from "@/lib/image-attachments";
import { studentDatabase } from "@/lib/firebase/student-database";
import { hasCourseAccess } from "@/lib/firebase/course-payment";
export async function myExamHistory(token?: string) {
  const { db, uid } = await studentDatabase(token);
  const attempts = await getDocs(
    query(collection(db, "exam_attempts"), where("studentId", "==", uid)),
  );
  return Promise.all(
    attempts.docs.map(async (a) => {
      const d = a.data(),
        exam = await getDoc(doc(db, "exams", d.examId));
      const course = exam.data()?.courseId
        ? await getDoc(doc(db, "courses", exam.data()!.courseId))
        : null;
      return {
        id: a.id,
        examId: d.examId,
        title: exam.data()?.title || "امتحان مؤرشف",
        course: course?.data()?.title || "بدون كورس",
        status: d.status,
        score: Number(d.score || 0),
        total: Number(d.totalMarks || exam.data()?.totalMarks || 0),
        percentage: Number(d.percentage || 0),
        createdAt: d.createdAt || "",
        maxAttempts: exam.data()?.maxAttempts ?? 0,
      };
    }),
  );
}
export async function myForumCourses(token?: string) {
  const { db, uid } = await studentDatabase(token);
  const profile = await getDoc(doc(db, "users", uid));
  const courses = await getDocs(collection(db, "courses"));
  const allowed = await Promise.all(
    courses.docs.map(async (c) =>
      profile.data()?.role === "admin" || (await hasCourseAccess(db, uid, c.id))
        ? { id: c.id, title: String(c.data().title) }
        : null,
    ),
  );
  return allowed.filter((c): c is { id: string; title: string } => c !== null);
}
async function forumAccess(courseId: string, token?: string) {
  if (!courseId || courseId.includes("/")) throw new Error("كورس غير صالح");
  const context = await studentDatabase(token);
  const profile = await getDoc(doc(context.db, "users", context.uid));
  if (
    profile.data()?.role !== "admin" &&
    !(await hasCourseAccess(context.db, context.uid, courseId))
  )
    throw new Error("منتدى الكورس متاح للمشتركين فقط");
  return { ...context, profile: profile.data() };
}
export async function authorizeForumImageUpload(
  courseId: string,
  token?: string,
) {
  await forumAccess(courseId, token);
  return { ok: true };
}
export async function courseForum(courseId: string, token?: string) {
  const { db } = await forumAccess(courseId, token);
  const rows = await getDocs(
    query(
      collection(db, "course_forum_posts"),
      where("courseId", "==", courseId),
    ),
  );
  return rows.docs
    .map((r) => {
      const d = r.data();
      return {
        id: r.id,
        title: String(d.title),
        content: String(d.content || ""),
        image: d.image as ImageAttachment | undefined,
        author: String(d.author),
        createdAt: String(d.createdAt),
        replies: (d.replies || []) as {
          id: string;
          author: string;
          content: string;
          image?: ImageAttachment;
          createdAt: string;
        }[],
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function writeCourseForum(
  input: {
    courseId: string;
    postId?: string;
    title?: string;
    content: string;
    image?: ImageAttachment;
  },
  token?: string,
) {
  const { db, uid, profile } = await forumAccess(input.courseId, token);
  const content = input.content.trim(),
    title = (input.title || "").trim();
  const image = validateForumImage(input.image, input.courseId, uid);
  if (
    (!content && !image && (input.postId || !title)) ||
    content.length > 10000 ||
    title.length > 200
  )
    throw new Error("راجع طول النص");
  const author = String(profile?.fullName || "عضو الكورس"),
    createdAt = new Date().toISOString();
  if (input.postId) {
    if (input.postId.includes("/")) throw new Error("منشور غير صالح");
    const ref = doc(db, "course_forum_posts", input.postId);
    const replyId = doc(collection(db, "course_forum_reply_ids")).id;
    await runTransaction(db, async (tx) => {
      const post = await tx.get(ref);
      if (!post.exists() || post.data().courseId !== input.courseId)
        throw new Error("المنشور غير موجود في الكورس");
      const replies = post.data().replies || [];
      if (replies.length >= 100)
        throw new Error("اكتمل عدد ردود هذا النقاش؛ افتح نقاشاً جديداً");
      tx.update(ref, {
        replies: [
          ...replies,
          {
            id: replyId,
            studentId: uid,
            author,
            content,
            createdAt,
            ...(image ? { image } : {}),
          },
        ],
      });
    });
  } else {
    const ref = doc(collection(db, "course_forum_posts"));
    await runTransaction(db, async (tx) => {
      tx.set(ref, {
        courseId: input.courseId,
        studentId: uid,
        author,
        title: title || (image ? "سؤال بصورة" : content.slice(0, 80)),
        content,
        ...(image ? { image } : {}),
        createdAt,
        replies: [],
      });
    });
  }
  return { ok: true };
}
