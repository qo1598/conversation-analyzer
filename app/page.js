'use client'

import { useState } from 'react'
import AudioUploader from './components/AudioUploader'
import ConversationAnalysis from './components/ConversationAnalysis'

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAnalysisComplete = (result) => {
    setAnalysisResult(result)
    setLoading(false)
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold text-center my-8">대화 분석 시스템</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">녹음 파일 업로드</h2>
        <AudioUploader 
          onAnalysisStart={() => {
            setLoading(true)
            setError(null)
          }}
          onAnalysisComplete={handleAnalysisComplete}
          onError={(err) => {
            setError(err)
            setLoading(false)
          }}
        />
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">대화 파일을 분석 중입니다. 잠시만 기다려주세요...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-8">
          <p><strong>오류 발생:</strong> {error}</p>
        </div>
      )}

      {analysisResult && !loading && (
        <ConversationAnalysis data={analysisResult} />
      )}
    </div>
  )
} 