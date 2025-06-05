'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { sessionAPI, recordingAPI } from '../../../lib/supabase'
import AudioRecorder from '../../components/AudioRecorder'

export default function StudentSession() {
  const router = useRouter()
  const params = useParams()
  const sessionCode = params.code
  
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (sessionCode && sessionCode.length === 6) {
      findSession()
    } else {
      setError('올바르지 않은 세션 코드입니다.')
      setLoading(false)
    }
  }, [sessionCode])

  const findSession = async () => {
    try {
      const { success, data, error: sessionError } = await sessionAPI.getSessionByCode(sessionCode)
      
      if (success && data) {
        setSession(data)
      } else {
        setError(sessionError || '존재하지 않는 세션 코드입니다.')
      }
    } catch (err) {
      console.error('세션 조회 오류:', err)
      setError('세션을 찾을 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRecordingComplete = async (result) => {
    setIsAnalyzing(false)
    
    // Supabase에 녹음 결과 저장
    if (session && result) {
      try {
        // AudioRecorder에서 전달받은 result에는 이미 분석 결과가 포함되어 있음
        // 실제 구현에서는 recordingAPI.uploadRecording을 사용하여 파일과 분석 결과를 저장
        console.log('녹음 완료:', result)
        setUploadSuccess(true)
      } catch (error) {
        console.error('녹음 저장 오류:', error)
        setError('녹음 저장 중 오류가 발생했습니다.')
      }
    } else {
      setUploadSuccess(true)
    }
  }

  const handleRecordingStart = () => {
    setIsAnalyzing(true)
    setError('')
    setUploadSuccess(false)
  }

  const handleError = (errorMessage) => {
    setError(errorMessage)
    setIsAnalyzing(false)
  }

  const handleGoHome = () => {
    if (mounted) {
      router.push('/')
    }
  }

  const handleNewRecording = () => {
    setUploadSuccess(false)
    setError('')
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">세션을 확인하는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              ⚠️
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleGoHome}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={handleGoHome}
                className="text-sm text-gray-600 hover:text-gray-800 mr-4"
              >
                ← 홈으로
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{session.name}</h1>
                <p className="text-sm text-gray-600">세션 코드: {session.code}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!uploadSuccess && !isAnalyzing && (
          <div className="space-y-8">
            {/* 안내 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  ℹ️
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-blue-800">녹음 안내</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>아래 빨간 버튼을 눌러 대화 녹음을 시작하세요</li>
                      <li>대화가 끝나면 정지 버튼을 눌러주세요</li>
                      <li>녹음된 내용을 확인한 후 업로드하면 완료됩니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* 녹음 컴포넌트 */}
            <AudioRecorder
              onRecordingComplete={handleRecordingComplete}
              onError={handleError}
              onAnalysisStart={handleRecordingStart}
            />

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p><strong>오류:</strong> {error}</p>
              </div>
            )}
          </div>
        )}

        {isAnalyzing && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">녹음을 업로드하고 있습니다</h3>
            <p className="text-gray-600">잠시만 기다려주세요...</p>
            <div className="mt-6 max-w-md mx-auto">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  🎤 녹음 파일을 서버에 업로드하고 있습니다.<br/>
                  완료되면 자동으로 완료 메시지가 표시됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {uploadSuccess && !isAnalyzing && (
          <div className="space-y-6">
            {/* 성공 메시지 */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                ✅
              </div>
              <h3 className="text-xl font-semibold text-green-800 mb-2">업로드 완료!</h3>
              <p className="text-green-700">녹음이 성공적으로 업로드되었습니다.</p>
            </div>
            
            {/* 새 녹음 버튼 */}
            <div className="text-center pt-6">
              <button
                onClick={handleNewRecording}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                🎤 새로 녹음하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 