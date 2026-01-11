'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

export default function AnalysisChart({ data, barColor = '#4F46E5' }) {
  if (!data || data.length === 0) return (
    <div className="h-full w-full flex items-center justify-center text-gray-400 text-sm">
      데이터가 없습니다
    </div>
  );

  return (
    <div className="w-full h-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
          <XAxis type="number" domain={[0, 1]} hide />
          <YAxis
            dataKey="name"
            type="category"
            width={80}
            tick={{ fontSize: 11, fill: '#6B7280', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: '#F3F4F6' }}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              padding: '8px 12px'
            }}
          />
          <Bar
            dataKey="score"
            fill={barColor}
            radius={[0, 4, 4, 0]}
            barSize={20}
            animationDuration={1500}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={barColor} fillOpacity={0.8 + (entry.score * 0.2)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
