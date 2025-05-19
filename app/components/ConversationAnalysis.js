'use client'

import { useState } from 'react'

export default function ConversationAnalysis({ data }) {
  const [activeTab, setActiveTab] = useState('transcript')

  if (!data) return null

  const { transcript, speakers, analysis } = data

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-semibold mb-6">분석 결과</h2>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'transcript'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              대화 내용
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'analysis'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              평가 결과
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'transcript' && (
        <div>
          <h3 className="text-lg font-medium mb-3">대화 내용 (화자 분리)</h3>
          <div className="space-y-4 mb-8">
            {transcript.map((item, index) => (
              <div key={index} className="flex">
                <div 
                  className="w-20 flex-shrink-0 font-medium text-right pr-4"
                  style={{ 
                    color: speakers[item.speaker]?.color || '#374151'
                  }}
                >
                  화자 {item.speaker}:
                </div>
                <div className="flex-grow">
                  <p>{item.text}</p>
                  <p className="text-xs text-gray-500">
                    ({Math.floor(item.start / 60)}:{Math.floor(item.start % 60).toString().padStart(2, '0')} - 
                    {Math.floor(item.end / 60)}:{Math.floor(item.end % 60).toString().padStart(2, '0')})
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div>
          <h3 className="text-lg font-medium mb-3">대화 평가 결과</h3>
          
          <div className="space-y-4">
            {analysis.criteria.map((criterion, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium mb-2">{criterion.name}</h4>
                <div className="flex items-center mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${criterion.score * 100}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm">{Math.round(criterion.score * 100)}%</span>
                </div>
                <p className="text-sm text-gray-600">{criterion.feedback}</p>
              </div>
            ))}
            
            <div className="mt-6 bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">종합 평가</h4>
              <p>{analysis.summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 