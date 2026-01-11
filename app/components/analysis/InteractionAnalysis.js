'use client'

import AnalysisChart from '../AnalysisChart'

export default function InteractionAnalysis({ data }) {
    if (!data) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                <h3 className="text-violet-200 text-xs font-bold uppercase mb-2">상호작용 분석</h3>
                <p className="text-lg leading-relaxed font-light">
                    {data.summary}
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-6">팀워크 지표</h4>
                    <div className="h-64">
                        <AnalysisChart data={data.criteria} barColor="#8b5cf6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-4">💡 더 나은 대화를 위한 제안</h4>
                    <div className="space-y-3">
                        {data.recommendations?.map((rec, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl hover:bg-violet-50 transition-colors">
                                <span className="flex-shrink-0 w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-bold text-xs mt-0.5">
                                    {i + 1}
                                </span>
                                <p className="text-sm text-gray-700 leading-snug">{rec}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h4 className="font-bold text-gray-800 mb-4">세부 지표 분석</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                    {data.criteria?.map((item, idx) => (
                        <div key={idx} className="p-4 border border-gray-100 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-600 text-sm">{item.name}</span>
                                <span className="font-bold text-violet-600 text-sm">{Math.round(item.score * 100)}점</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1.5 rounded-full mb-3">
                                <div
                                    className="bg-violet-500 h-1.5 rounded-full transition-all duration-1000"
                                    style={{ width: `${item.score * 100}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500">{item.feedback}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
