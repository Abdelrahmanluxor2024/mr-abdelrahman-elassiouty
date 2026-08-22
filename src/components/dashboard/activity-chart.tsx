'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface ActivityDay {
  day: string;
  current: number;
  previous: number;
}

const defaultData: ActivityDay[] = [
  { day: 'السبت', current: 30, previous: 20 },
  { day: 'الأحد', current: 65, previous: 40 },
  { day: 'الإثنين', current: 45, previous: 35 },
  { day: 'الثلاثاء', current: 80, previous: 50 },
  { day: 'الأربعاء', current: 70, previous: 60 },
  { day: 'الخميس', current: 90, previous: 75 },
  { day: 'الجمعة', current: 85, previous: 70 },
];

export function DashboardActivityChart({ data = defaultData }: { data?: ActivityDay[] }) {
  return (
    <div className="h-64 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94A3B8', fontSize: 12 }}
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F172A',
              borderRadius: '16px',
              border: '1px solid #334155',
              color: '#fff',
              fontSize: '12px',
            }}
          />
          <Line
            type="monotone"
            dataKey="previous"
            name="الأسبوع الماضي"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#10B981' }}
          />
          <Line
            type="monotone"
            dataKey="current"
            name="الأسبوع الحالي"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ r: 5, fill: '#3B82F6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
