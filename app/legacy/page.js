'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AudioUploader from '../components/AudioUploader'
import ConversationAnalysis from '../components/ConversationAnalysis'

export default function LegacyAnalyzer() {
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
    if (mounted) {
      // 브라우저 히스토리를 사용하여 이전 페이지로 돌아가기
      if (window.history.length > 1) {
        router.back()
      } else {
        // 히스토리가 없는 경우 교사 대시보드로 이동
        router.push('/teacher/dashboard')
      }
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={handleGoBack}
                className="text-sm text-gray-600 hover:text-gray-800 mr-4"
              >
                ← 뒤로 가기
              </button>
              <h1 className="text-2xl font-bold text-gray-900">파일 업로드 분석</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">녹음 파일 업로드</h2>
            <p className="text-gray-600 mb-4">
              기존에 녹음된 파일을 업로드하여 분석할 수 있습니다.
            </p>
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
      </div>
    </div>
  )
} 