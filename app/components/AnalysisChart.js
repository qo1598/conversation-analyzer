    'use client'

    import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-2 border border-gray-200 rounded-lg shadow-sm">
            <p className="font-semibold">{`${label}`}</p>
            <p className="text-sm text-blue-600">{`점수: ${payload[0].value} / 100`}</p>
          </div>
        );
      }
      return null;
    };

    export default function AnalysisChart({ data, barColor }) {
      if (!data || data.length === 0) {
        return <p className="text-center text-gray-500">분석 데이터가 없습니다.</p>;
      }

      const chartData = data.map(item => ({
        name: item.name,
        score: Math.round(item.score * 100)
      }));

      return (
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 100]} hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false} 
                tickLine={false}
                tick={{ fontSize: 12, fill: '#4B5563' }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(239, 246, 255, 0.5)' }} />
              <Bar dataKey="score" barSize={20}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={barColor || '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
