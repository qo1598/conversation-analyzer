'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AudioUploader from '../components/AudioUploader'
import ConversationAnalysis from '../components/ConversationAnalysis'

export default function FileAnalysisPage() {
  const router = useRouter()
  const [analysisResult, setAnalysisResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleAnalysisComplete = (result) => {
    setAnalysisResult(result)
    setLoading(false)
  }

  const handleGoBack = () => {
    if (mounted) router.push('/teacher/dashboard')
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 컴팩트 헤더 */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 shadow-sm z-20 sticky top-0">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={handleGoBack} className="text-gray-400 hover:text-indigo-600 transition-colors flex items-center gap-1 font-medium">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              <span>대시보드로 돌아가기</span>
            </button>
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              📂 파일 직접 분석
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {!analysisResult && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 mb-8 text-white relative overflow-hidden shadow-xl">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2">기존 녹음 파일 분석</h2>
                <p className="text-indigo-100 max-w-lg">
                  오프라인에서 녹음했거나 다른 기기에서 가져온 음성 파일을 업로드하세요.<br />
                  AI가 화자를 분리하고 대화 내용을 분석해드립니다.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 text-9xl transform translate-x-10 translate-y-10">
                🎙️
              </div>
            </div>

            <div className="bg-white shadow-lg shadow-indigo-100 rounded-2xl p-8 border border-white">
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
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">분석 중입니다...</h3>
              <p className="text-gray-500">대화 내용을 텍스트로 변환하고<br />AI가 정밀 분석을 수행하고 있습니다.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto mt-6 bg-red-50 border border-red-200 rounded-2xl p-6 flex gap-4 items-start animate-in slide-in-from-top-4">
            <div className="text-2xl">⚠️</div>
            <div>
              <h3 className="text-red-800 font-bold mb-1">분석 오류 발생</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {analysisResult && !loading && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <ConversationAnalysis data={analysisResult} />
          </div>
        )}
      </div>
    </div>
  )
}