"use client";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toast } from "sonner";
export function QuestionExplanationsEditor({ examId }: { examId: string }) {
  const [rows, setRows] = useState<
      { id: string; text: string; explanation: string; order: number }[]
    >([]),
    [error, setError] = useState(false),
    [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    setRows([]);
    setError(false);
    getDocs(query(collection(db, "questions"), where("examId", "==", examId)))
      .then((s) => {
        if (active)
          setRows(
            s.docs
              .map((d) => ({
                id: d.id,
                text: d.data().questionText || "",
                explanation: d.data().explanation || "",
                order: d.data().orderIndex || 0,
              }))
              .sort((a, b) => a.order - b.order),
          );
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [examId]);
  async function save(id: string, explanation: string) {
    setPending(true);
    try {
      await updateDoc(doc(db, "questions", id), { explanation });
      toast.success("تم حفظ شرح الإجابة");
    } catch {
      toast.error("تعذر حفظ الشرح");
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="rounded-xl border p-4">
      <summary className="cursor-pointer font-bold">
        شرح الإجابات ({rows.length})
      </summary>
      {error && <p role="alert">تعذر تحميل الأسئلة.</p>}
      {rows.map((r, i) => (
        <div key={r.id} className="my-4 space-y-2">
          <label className="block text-sm" htmlFor={`explanation-${r.id}`}>
            {i + 1}. {r.text}
          </label>
          <textarea
            id={`explanation-${r.id}`}
            maxLength={10000}
            className="w-full rounded-xl border bg-transparent p-3"
            value={r.explanation}
            onChange={(e) =>
              setRows((old) =>
                old.map((q) =>
                  q.id === r.id ? { ...q, explanation: e.target.value } : q,
                ),
              )
            }
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => save(r.id, r.explanation)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-white"
          >
            حفظ الشرح
          </button>
        </div>
      ))}
    </details>
  );
}
