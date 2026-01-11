'use client'

import AnalysisChart from '../AnalysisChart'

export default function OverallAnalysis({ data }) {
    if (!data) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* 요약 히어로 섹션 */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h3 className="text-indigo-100 font-medium mb-2 uppercase tracking-wide text-xs">종합 분석 요약</h3>
                <p className="text-xl md:text-2xl font-light leading-relaxed opacity-95">
                    "{data.summary || '분석 결과가 없습니다.'}"
                </p>
            </div>

            {/* 차트 & 상세 분석 그리드 */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* 왼쪽: 차트 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit">
                    <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
                        평가 지표
                    </h4>
                    <div className="h-64">
                        <AnalysisChart data={data.criteria} barColor="#6366f1" />
                    </div>
                </div>

                {/* 오른쪽: 상세 피드백 리스트 */}
                <div className="space-y-4">
                    <h4 className="font-bold text-gray-800 mb-2 px-2">상세 피드백</h4>
                    {data.criteria && data.criteria.map((item, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-700">{item.name}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.score >= 0.8 ? 'bg-green-100 text-green-700' :
                                        item.score >= 0.5 ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                    }`}>
                                    {Math.round(item.score * 100)}점
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">
                                {item.feedback}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
