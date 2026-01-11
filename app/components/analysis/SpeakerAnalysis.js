'use client'

import { useState, useEffect } from 'react'
import AnalysisChart from '../AnalysisChart'

export default function SpeakerAnalysis({ speakers, analysis }) {
    const [selectedSpeakerId, setSelectedSpeakerId] = useState('')

    useEffect(() => {
        if (speakers && Object.keys(speakers).length > 0 && !selectedSpeakerId) {
            setSelectedSpeakerId(Object.keys(speakers)[0])
        }
    }, [speakers])

    const currentAnalysis = analysis?.[selectedSpeakerId];
    const speakerInfo = speakers?.[selectedSpeakerId];

    return (
        <div className="space-y-6">
            {/* 화자 선택기 */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {speakers && Object.entries(speakers).map(([id, info]) => (
                    <button
                        key={id}
                        onClick={() => setSelectedSpeakerId(id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap shadow-sm ${selectedSpeakerId === id
                                ? 'bg-indigo-600 text-white ring-2 ring-indigo-200 ring-offset-2'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        <div
                            className="w-2 h-2 rounded-full bg-white"
                            style={{ backgroundColor: selectedSpeakerId === id ? 'white' : info.color }}
                        />
                        {info.name}
                    </button>
                ))}
            </div>

            {currentAnalysis ? (
                <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-6">
                    {/* 요약 카드 */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg">
                        <h4 className="text-emerald-100 text-xs font-bold uppercase mb-2">화자 분석 요약</h4>
                        <p className="text-lg leading-relaxed font-light">
                            {currentAnalysis.summary}
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* 차트 카드 */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                            <h4 className="font-bold text-gray-800 mb-6">역량 분석 차트</h4>
                            <div className="h-60">
                                <AnalysisChart data={currentAnalysis.criteria} barColor={speakerInfo?.color} />
                            </div>
                        </div>

                        {/* 강점 & 개선점 카드 */}
                        <div className="grid grid-rows-2 gap-4">
                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                                <h5 className="flex items-center gap-2 font-bold text-blue-700 mb-3">
                                    <span className="text-xl">👍</span> 강점
                                </h5>
                                <ul className="space-y-2">
                                    {currentAnalysis.strengths?.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                            <span className="mt-1.5 w-1 h-1 bg-blue-400 rounded-full"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100">
                                <h5 className="flex items-center gap-2 font-bold text-orange-700 mb-3">
                                    <span className="text-xl">💪</span> 개선해볼 점
                                </h5>
                                <ul className="space-y-2">
                                    {currentAnalysis.improvements?.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                            <span className="mt-1.5 w-1 h-1 bg-orange-400 rounded-full"></span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 text-gray-400">화자를 선택해주세요.</div>
            )}
        </div>
    )
}
