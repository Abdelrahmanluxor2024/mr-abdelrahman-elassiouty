"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { LearningDay } from "@/lib/learning-stats";
export function DashboardActivityChart({ data }: { data: LearningDay[] }) {
  const empty = data.every((d) => !d.lessons && !d.exams);
  return (
    <div className="space-y-3">
      {empty && (
        <p className="text-center text-sm text-muted">
          لا يوجد نشاط مسجل في آخر ٧ أيام. سجّل إكمال درس أو سلّم امتحاناً ليظهر
          هنا.
        </p>
      )}
      <div
        className="h-64 w-full"
        role="img"
        aria-label="عدد الدروس المكتملة والامتحانات المسلّمة خلال آخر سبعة أيام"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 8, left: -25, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--chart-grid)"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--chart-text)", fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--chart-text)", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                color: "var(--ink)",
                borderColor: "var(--line)",
                borderRadius: 12,
              }}
              cursor={{ fill: "var(--chart-grid)" }}
            />
            <Legend />
            <Bar
              dataKey="lessons"
              name="دروس أكملتها"
              fill="#2563eb"
              radius={[5, 5, 0, 0]}
            />
            <Bar
              dataKey="exams"
              name="امتحانات سلّمتها"
              fill="#0d9488"
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer">عرض الأرقام بالتفصيل</summary>
        <table className="mt-3 w-full text-right">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>دروس مكتملة</th>
              <th>امتحانات مسلّمة</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date}>
                <td className="py-2">{d.date}</td>
                <td>{d.lessons}</td>
                <td>{d.exams}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
