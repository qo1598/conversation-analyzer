'use client'

import { useState } from 'react'
import TranscriptView from './analysis/TranscriptView'
import OverallAnalysis from './analysis/OverallAnalysis'
import SpeakerAnalysis from './analysis/SpeakerAnalysis'
import InteractionAnalysis from './analysis/InteractionAnalysis'

export default function ConversationAnalysis({ data }) {
  const [activeTab, setActiveTab] = useState('transcript')

  if (!data) return null;

  const { transcript, speakers, analysis } = data

  const tabs = [
    { id: 'transcript', label: '대화 내용', icon: '📝' },
    { id: 'overall', label: '종합 평가', icon: '📊' },
    { id: 'speakers', label: '화자별 분석', icon: '👤' },
    { id: 'interaction', label: '상호작용', icon: '🤝' },
  ]

  return (
    <div className="bg-white shadow-xl shadow-indigo-100/50 rounded-3xl overflow-hidden border border-white">
      {/* 탭 네비게이션 */}
      <div className="bg-gray-50/50 border-b border-gray-100 px-6 pt-6 pb-0">
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">AI 분석 결과</h2>
        <div className="flex gap-6 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-2 text-sm font-bold flex items-center gap-2 transition-all relative whitespace-nowrap ${activeTab === tab.id
                  ? 'text-indigo-600'
                  : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
              {/* 활성 탭 인디케이터 */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full layout-id-indicator"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 컨텐츠 영역 */}
      <div className="p-4 md:p-8 min-h-[500px] bg-white">
        {activeTab === 'transcript' && (
          <TranscriptView transcript={transcript} speakers={speakers} />
        )}

        {activeTab === 'overall' && (
          <OverallAnalysis data={analysis?.overall} />
        )}

        {activeTab === 'speakers' && (
          <SpeakerAnalysis speakers={speakers} analysis={analysis?.speakers} />
        )}

        {activeTab === 'interaction' && (
          <InteractionAnalysis data={analysis?.interaction} />
        )}
      </div>
    </div>
  )
}
