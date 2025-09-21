'use client'

import { useState } from 'react'
import AnalysisChart from './AnalysisChart'; // 차트 컴포넌트 임포트

export default function ConversationAnalysis({ data }) {
  const [activeTab, setActiveTab] = useState('transcript')
  const [selectedSpeaker, setSelectedSpeaker] = useState('all')
  const [analysisView, setAnalysisView] = useState('overall')
  const [selectedAnalysisSpeaker, setSelectedAnalysisSpeaker] = useState('')

  console.log('=== ConversationAnalysis 컴포넌트 데이터 ===')
  console.log('data:', data)
  
  if (!data) {
    console.log('데이터가 없습니다')
    return null;
  }

  const { transcript, speakers, analysis } = data
  
  console.log('transcript:', transcript)
  console.log('speakers:', speakers)
  console.log('analysis:', analysis)
  
  const filteredTranscript = selectedSpeaker === 'all' 
    ? transcript 
    : transcript.filter(item => item.speaker === selectedSpeaker)

  if (analysisView === 'speakers' && !selectedAnalysisSpeaker && speakers && Object.keys(speakers).length > 0) {
    setSelectedAnalysisSpeaker(Object.keys(speakers)[0])
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6">분석 결과</h2>

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
          {/* 화자 필터 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">화자 필터</label>
            <select
              value={selectedSpeaker}
              onChange={(e) => setSelectedSpeaker(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">전체 화자</option>
              {speakers && Object.entries(speakers).map(([id, info]) => (
                <option key={id} value={id}>{info.name}</option>
              ))}
            </select>
          </div>

          {/* 대화 내용 */}
          <div className="space-y-4">
            {transcript && transcript.length > 0 ? (
              filteredTranscript.map((item, index) => (
                <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-blue-600">
                      {speakers && speakers[item.speaker] ? speakers[item.speaker].name : `화자 ${item.speaker}`}
                    </span>
                    <span className="text-xs text-gray-500">
                      {item.start ? `${Math.floor(item.start / 60)}:${String(Math.floor(item.start % 60)).padStart(2, '0')}` : ''}
                      {item.end ? ` - ${Math.floor(item.end / 60)}:${String(Math.floor(item.end % 60)).padStart(2, '0')}` : ''}
                    </span>
                  </div>
                  <p className="text-gray-800 leading-relaxed">{item.text}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-500">대화 내용이 없습니다</p>
                <p className="text-sm text-gray-400 mt-2">
                  STT 처리가 완료되지 않았거나 대화 내용이 비어있습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div>
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setAnalysisView('overall')}
                  className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    analysisView === 'overall' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  전체 대화 평가
                </button>
                <button
                  onClick={() => setAnalysisView('speakers')}
                  className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    analysisView === 'speakers' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  화자별 평가
                </button>
                <button
                  onClick={() => setAnalysisView('interaction')}
                  className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    analysisView === 'interaction' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  상호작용 분석
                </button>
              </nav>
            </div>
          </div>

          {analysisView === 'overall' && (
            <div>
              <h3 className="text-lg font-medium mb-4">전체 대화 평가</h3>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                <h4 className="font-medium mb-3 text-blue-800">종합 평가</h4>
                <p className="text-gray-800 leading-relaxed">{analysis.overall?.summary}</p>
              </div>
              <AnalysisChart data={analysis.overall?.criteria} barColor="#3B82F6" />
              <div className="mt-4 space-y-2">
                {analysis.overall?.criteria?.map((criterion, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    <strong className="font-semibold">{criterion.name}:</strong> {criterion.feedback}
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisView === 'speakers' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">화자별 개별 평가</h3>
                {speakers && Object.keys(speakers).length > 0 && (
                  <select
                    value={selectedAnalysisSpeaker}
                    onChange={(e) => setSelectedAnalysisSpeaker(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
                  >
                    {Object.entries(speakers).map(([id, info]) => (
                      <option key={id} value={id}>{info.name}</option>
                    ))}
                  </select>
                )}
              </div>
              {selectedAnalysisSpeaker && analysis.speakers?.[selectedAnalysisSpeaker] && (
                <div className="border border-gray-200 rounded-lg p-6">
                   <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
                     <h4 className="font-medium mb-3 text-green-800">종합 분석: {speakers[selectedAnalysisSpeaker]?.name}</h4>
                     <p className="text-gray-800 leading-relaxed">{analysis.speakers[selectedAnalysisSpeaker].summary}</p>
                   </div>
                  <AnalysisChart data={analysis.speakers[selectedAnalysisSpeaker].criteria} barColor="#10B981" />
                   <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                     {analysis.speakers[selectedAnalysisSpeaker].strengths && (
                       <div className="text-sm text-gray-700">
                         <h5 className="font-semibold mb-2">강점</h5>
                         <ul className="list-disc list-inside space-y-1">
                           {analysis.speakers[selectedAnalysisSpeaker].strengths.map((item, i) => <li key={i}>{item}</li>)}
                         </ul>
                       </div>
                     )}
                     {analysis.speakers[selectedAnalysisSpeaker].improvements && (
                       <div className="text-sm text-gray-700">
                         <h5 className="font-semibold mb-2">개선점</h5>
                         <ul className="list-disc list-inside space-y-1">
                           {analysis.speakers[selectedAnalysisSpeaker].improvements.map((item, i) => <li key={i}>{item}</li>)}
                         </ul>
                       </div>
                     )}
                   </div>
                </div>
              )}
            </div>
          )}

          {analysisView === 'interaction' && (
            <div>
              <h3 className="text-lg font-medium mb-4">화자간 상호작용 분석</h3>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 mb-6">
                <h4 className="font-medium mb-3 text-purple-800">상호작용 요약</h4>
                <p className="text-gray-800 leading-relaxed">{analysis.interaction?.summary}</p>
              </div>
              <AnalysisChart data={analysis.interaction?.criteria} barColor="#8B5CF6" />
               <div className="mt-4 space-y-2">
                {analysis.interaction?.criteria?.map((criterion, index) => (
                  <div key={index} className="text-sm text-gray-700">
                    <strong className="font-semibold">{criterion.name}:</strong> {criterion.feedback}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
