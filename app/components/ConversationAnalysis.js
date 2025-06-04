'use client'

import { useState } from 'react'

export default function ConversationAnalysis({ data }) {
  const [activeTab, setActiveTab] = useState('transcript')
  const [selectedSpeaker, setSelectedSpeaker] = useState('all')
  const [analysisView, setAnalysisView] = useState('overall')
  const [selectedAnalysisSpeaker, setSelectedAnalysisSpeaker] = useState('') // 화자별 분석용 선택

  if (!data) return null

  const { transcript, speakers, analysis } = data

  // 선택된 화자에 따라 대화 필터링
  const filteredTranscript = selectedSpeaker === 'all' 
    ? transcript 
    : transcript.filter(item => item.speaker === selectedSpeaker)

  // 화자별 분석에서 첫 번째 화자를 기본값으로 설정
  if (analysisView === 'speakers' && !selectedAnalysisSpeaker && Object.keys(speakers).length > 0) {
    setSelectedAnalysisSpeaker(Object.keys(speakers)[0])
  }

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">대화 내용 (화자 분리)</h3>
            
            {/* 화자 선택 드롭다운 */}
            <div className="flex items-center space-x-2">
              <label htmlFor="speaker-select" className="text-sm font-medium text-gray-700">
                화자 선택:
              </label>
              <select
                id="speaker-select"
                value={selectedSpeaker}
                onChange={(e) => setSelectedSpeaker(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">전체 보기</option>
                {Object.entries(speakers).map(([speakerId, speakerInfo]) => (
                  <option key={speakerId} value={speakerId}>
                    {speakerInfo.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 선택된 화자 정보 표시 */}
          {selectedSpeaker !== 'all' && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: speakers[selectedSpeaker]?.color || '#374151' }}
                ></div>
                <span className="font-medium">{speakers[selectedSpeaker]?.name}</span>
                <span className="text-sm text-gray-600">
                  ({filteredTranscript.length}개 발화)
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-4 mb-8">
            {filteredTranscript.map((item, index) => (
              <div key={index} className="flex">
                <div 
                  className="w-20 flex-shrink-0 font-medium text-right pr-4"
                  style={{ 
                    color: speakers[item.speaker]?.color || '#374151'
                  }}
                >
                  {speakers[item.speaker]?.name || `화자 ${item.speaker}`}:
                </div>
                <div className="flex-grow">
                  <p className="text-gray-800 leading-relaxed">{item.text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    ({Math.floor(item.start / 60)}:{Math.floor(item.start % 60).toString().padStart(2, '0')} - 
                    {Math.floor(item.end / 60)}:{Math.floor(item.end % 60).toString().padStart(2, '0')})
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredTranscript.length === 0 && selectedSpeaker !== 'all' && (
            <div className="text-center py-8 text-gray-500">
              <p>선택한 화자의 발화가 없습니다.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analysis' && (
        <div>
          {/* 분석 유형 선택 탭 */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setAnalysisView('overall')}
                  className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    analysisView === 'overall'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  전체 대화 평가
                </button>
                <button
                  onClick={() => setAnalysisView('speakers')}
                  className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    analysisView === 'speakers'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  화자별 평가
                </button>
                <button
                  onClick={() => setAnalysisView('interaction')}
                  className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                    analysisView === 'interaction'
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  상호작용 분석
                </button>
              </nav>
            </div>
          </div>

          {/* 전체 대화 평가 */}
          {analysisView === 'overall' && (
            <div>
              <h3 className="text-lg font-medium mb-4">전체 대화 평가</h3>
              
              <div className="space-y-4">
                {analysis.overall?.criteria?.map((criterion, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium mb-3">{criterion.name}</h4>
                    <div className="flex items-center mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${criterion.score * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-blue-600 w-12">
                        {Math.round(criterion.score * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{criterion.feedback}</p>
                  </div>
                ))}
                
                <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium mb-3 text-blue-800">종합 평가</h4>
                  <p className="text-gray-800 leading-relaxed">{analysis.overall?.summary}</p>
                </div>
              </div>
            </div>
          )}

          {/* 화자별 평가 */}
          {analysisView === 'speakers' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">화자별 개별 평가</h3>
                
                {/* 화자 선택 드롭다운 */}
                <div className="flex items-center space-x-2">
                  <label htmlFor="analysis-speaker-select" className="text-sm font-medium text-gray-700">
                    화자 선택:
                  </label>
                  <select
                    id="analysis-speaker-select"
                    value={selectedAnalysisSpeaker}
                    onChange={(e) => setSelectedAnalysisSpeaker(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {Object.entries(speakers).map(([speakerId, speakerInfo]) => (
                      <option key={speakerId} value={speakerId}>
                        {speakerInfo.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 선택된 화자 분석 결과 */}
              {selectedAnalysisSpeaker && analysis.speakers?.[selectedAnalysisSpeaker] && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center mb-6">
                    <div 
                      className="w-5 h-5 rounded-full mr-3"
                      style={{ backgroundColor: speakers[selectedAnalysisSpeaker]?.color }}
                    ></div>
                    <h4 className="text-xl font-medium">{speakers[selectedAnalysisSpeaker]?.name}</h4>
                  </div>

                  {/* 평가 기준 */}
                  <div className="space-y-4 mb-6">
                    {analysis.speakers[selectedAnalysisSpeaker].criteria?.map((criterion, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h5 className="font-medium mb-3">{criterion.name}</h5>
                        <div className="flex items-center mb-3">
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="bg-green-600 h-3 rounded-full transition-all duration-500" 
                              style={{ width: `${criterion.score * 100}%` }}
                            ></div>
                          </div>
                          <span className="ml-3 text-sm font-medium text-green-600 w-12">
                            {Math.round(criterion.score * 100)}%
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{criterion.feedback}</p>
                      </div>
                    ))}
                  </div>

                  {/* 강점과 개선점 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h5 className="text-sm font-medium text-green-800 mb-3">강점</h5>
                      <ul className="text-sm text-gray-700 space-y-2">
                        {analysis.speakers[selectedAnalysisSpeaker].strengths?.map((strength, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-600 mr-2">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h5 className="text-sm font-medium text-orange-800 mb-3">개선점</h5>
                      <ul className="text-sm text-gray-700 space-y-2">
                        {analysis.speakers[selectedAnalysisSpeaker].improvements?.map((improvement, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-orange-600 mr-2">•</span>
                            <span>{improvement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 요약 */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h5 className="font-medium mb-3 text-gray-800">종합 분석</h5>
                    <p className="text-gray-800 leading-relaxed">{analysis.speakers[selectedAnalysisSpeaker].summary}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 상호작용 분석 */}
          {analysisView === 'interaction' && (
            <div>
              <h3 className="text-lg font-medium mb-4">화자간 상호작용 분석</h3>
              
              <div className="space-y-4">
                {analysis.interaction?.criteria?.map((criterion, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium mb-3">{criterion.name}</h4>
                    <div className="flex items-center mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-purple-600 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${criterion.score * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-3 text-sm font-medium text-purple-600 w-12">
                        {Math.round(criterion.score * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{criterion.feedback}</p>
                  </div>
                ))}
                
                <div className="mt-6 bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-medium mb-3 text-purple-800">상호작용 요약</h4>
                  <p className="mb-4 text-gray-800 leading-relaxed">{analysis.interaction?.summary}</p>
                  
                  {analysis.interaction?.recommendations && (
                    <div>
                      <h5 className="font-medium text-blue-700 mb-3">개선 제안</h5>
                      <ul className="text-sm text-gray-700 space-y-2">
                        {analysis.interaction.recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span>{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 