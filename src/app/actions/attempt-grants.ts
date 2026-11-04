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
import { adminDatabase } from "@/lib/firebase/admin-database";
import { hasCourseAccess } from "@/lib/firebase/course-payment";
import { normalizeStudentPhone } from "@/lib/phone";
export async function manageLessonAttempts(input: {
  phone: string;
  lessonId: string;
  confirm?: boolean;
  expectedStudentId?: string;
  idToken?: string;
}) {
  try {
    const { db, uid } = await adminDatabase(input.idToken);
    const phone = normalizeStudentPhone(input.phone);
    if (!phone) throw new Error("اكتب رقم موبايل مصري صحيحاً");
    const users = await getDocs(collection(db, "users"));
    const matches = users.docs.filter(
      (u) =>
        (!u.data().role || u.data().role === "student") &&
        normalizeStudentPhone(u.data().phone || "") === phone,
    );
    if (matches.length !== 1)
      throw new Error(
        matches.length
          ? "الرقم مرتبط بأكثر من حساب. راجع بيانات الطلاب"
          : "لا يوجد طالب بهذا الرقم",
      );
    const student = matches[0],
      studentId = student.id,
      lesson = await getDoc(doc(db, "lessons", input.lessonId));
    if (input.confirm && input.expectedStudentId !== studentId)
      throw new Error("أعد التحقق من حساب الطالب قبل التأكيد");
    if (!lesson.exists() || lesson.data().isPublished === false)
      throw new Error("الدرس غير متاح");
    if (!(await hasCourseAccess(db, studentId, lesson.data().courseId)))
      throw new Error(
        "الطالب ليس لديه وصول صالح للكورس؛ المحاولة لا تمنح اشتراكاً",
      );
    const exams = await getDocs(
      query(collection(db, "exams"), where("lessonId", "==", input.lessonId)),
    );
    const active = exams.docs.filter(
      (e) =>
        e.data().isActive === true &&
        e.data().courseId === lesson.data().courseId,
    );
    if (!active.length || active.length > 100)
      throw new Error("الدرس لا يحتوي امتحانات نشطة، أو تجاوز حد المعالجة");
    const histories = await Promise.all(
      active.map((e) =>
        getDocs(
          query(
            collection(db, "exam_attempts"),
            where("studentId", "==", studentId),
            where("examId", "==", e.id),
          ),
        ),
      ),
    );
    const name =
      student.data().fullName || student.data().full_name || "الطالب";
    if (!input.confirm)
      return {
        ok: true,
        studentId,
        name,
        examCount: active.length,
        message:
          "راجع اسم الطالب ثم أكد المنح. الامتحانات غير المستهلكة أو الجاري حلها لن تتغير.",
      };
    const granted = await runTransaction(db, async (tx) => {
      const admin = await tx.get(doc(db, "users", uid));
      if (admin.data()?.role !== "admin")
        throw new Error("صلاحيات المسؤول تغيرت");
      const states = await Promise.all(
        active.map(async (e, i) => {
          const ref = doc(db, "exam_attempt_grants", `${studentId}_${e.id}`);
          const [permit, liveExam, ...attempts] = await Promise.all([
            tx.get(ref),
            tx.get(doc(db, "exams", e.id)),
            ...histories[i].docs.map((a) =>
              tx.get(doc(db, "exam_attempts", a.id)),
            ),
          ]);
          const generation = Number(permit.data()?.generation || 0),
            used = Number(permit.data()?.usedGeneration || 0);
          if (
            permit.exists() &&
            (permit.data()?.studentId !== studentId ||
              permit.data()?.examId !== e.id)
          )
            throw new Error("تعارض في سجل المنح");
          const current = generation
            ? await tx.get(
                doc(
                  db,
                  "exam_attempts",
                  `${studentId}_${e.id}_grant_${generation}`,
                ),
              )
            : null;
          return { e, ref, generation, used, liveExam, attempts, current };
        }),
      );
      const eligible = states.filter(
        (s) =>
          s.liveExam.data()?.isActive === true &&
          s.liveExam.data()?.lessonId === input.lessonId &&
          s.liveExam.data()?.courseId === lesson.data().courseId &&
          s.generation <= s.used &&
          !s.attempts.some((a) => a.data()?.status === "in_progress") &&
          s.current?.data()?.status !== "in_progress" &&
          s.attempts.some((a) =>
            ["passed", "failed", "pending"].includes(a.data()?.status),
          ),
      );
      const auditRefs = eligible.map((s) =>
        doc(
          db,
          "exam_attempt_grant_audit",
          `${studentId}_${s.e.id}_${s.generation + 1}`,
        ),
      );
      const audits = await Promise.all(auditRefs.map((ref) => tx.get(ref)));
      if (audits.some((a) => a.exists()))
        throw new Error("تعارض في سجل التدقيق؛ راجع المنح السابقة بدون حذفها");
      const now = new Date().toISOString();
      eligible.forEach((s) => {
        const generation = s.generation + 1;
        const record = {
          studentId,
          examId: s.e.id,
          lessonId: input.lessonId,
          generation,
          usedGeneration: s.used,
          grantedBy: uid,
          grantedAt: now,
        };
        tx.set(s.ref, record);
        tx.set(
          doc(
            db,
            "exam_attempt_grant_audit",
            `${studentId}_${s.e.id}_${generation}`,
          ),
          record,
        );
      });
      return eligible.length;
    });
    return {
      ok: true,
      studentId,
      name,
      examCount: active.length,
      message: granted
        ? `تم منح ${name} محاولة إضافية في ${granted} امتحان. النتائج السابقة محفوظة`
        : "لم تُضف محاولات: هناك منحة متاحة بالفعل، أو محاولة جارية، أو لم يُستهلك الامتحان بعد",
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "تعذر منح المحاولة",
    };
  }
}
