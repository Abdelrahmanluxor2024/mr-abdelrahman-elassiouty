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

const data = [
  { day: 'الأربعاء', current: 0, previous: 0 },
  { day: 'الخميس', current: 0, previous: 0 },
  { day: 'الجمعة', current: 0, previous: 0 },
  { day: 'السبت', current: 0, previous: 0 },
  { day: 'الأحد', current: 0, previous: 0 },
  { day: 'الإثنين', current: 0, previous: 0 },
  { day: 'الثلاثاء', current: 0, previous: 0 },
];

export function DashboardActivityChart() {
  return (
    <div className="h-64 w-full pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#64748B', fontSize: 12 }}
            domain={[0, 100]}
            ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E1B4B',
              borderRadius: '12px',
              border: 'none',
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
            stroke="#EF4444"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#EF4444' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
