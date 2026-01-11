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
      const { success, data, error } = await sessionAPI.getSessionByCode(sessionCode)
      if (success && data) {
        setSession(data)
      } else {
        setError('유효하지 않은 세션입니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRecordingComplete = async (result) => {
    setIsAnalyzing(false)

    if (session && result) {
      try {
        const uploadResult = await recordingAPI.uploadRecording(
          session.id,
          null,
          {
            transcript: result.transcript || [],
            speakers: result.speakers || {},
            analysis: result.analysis || {}
          }
        )

        if (uploadResult.success) {
          setUploadSuccess(true)
        } else {
          throw new Error('저장 실패')
        }
      } catch (error) {
        setError('결과 저장 중 오류가 발생했습니다.')
      }
    }
  }

  const handleGoHome = () => router.push('/')

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">세션 입장 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center border border-red-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⚠️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">입장 불가</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button onClick={handleGoHome} className="w-full bg-gray-900 text-white rounded-xl py-3 font-bold hover:bg-black transition-colors">
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-b-[40px] shadow-lg"></div>

      <header className="relative z-10 p-6 flex justify-between items-center text-white max-w-2xl mx-auto w-full">
        <button onClick={handleGoHome} className="text-white/80 hover:text-white transition-colors">
          ← 나가기
        </button>
        <span className="font-mono bg-white/20 px-3 py-1 rounded-full text-sm backdrop-blur-md border border-white/20">
          CODE: {session.code}
        </span>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center px-4 -mt-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 w-full max-w-xl p-8 border border-white/50 backdrop-blur-sm">

          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-gray-800 mb-2">{session.name}</h1>
            <p className="text-gray-500 text-sm">대화를 녹음하면 AI가 분석해드립니다.</p>
          </div>

          {!uploadSuccess && !isAnalyzing && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-indigo-50 rounded-2xl p-4 flex gap-4 items-start">
                <span className="text-2xl">ℹ️</span>
                <div className="text-sm text-indigo-800 leading-relaxed">
                  <p className="font-bold mb-1">녹음 가이드</p>
                  참여자의 목소리가 잘 들리도록 가까운 곳에 기기를 두세요. 대화가 끝나면 정지 버튼을 누르고 분석을 시작하세요.
                </div>
              </div>

              <div className="flex justify-center py-4">
                <AudioRecorder
                  sessionId={session?.id}
                  onRecordingComplete={handleRecordingComplete}
                  onError={(msg) => setError(msg)}
                  onAnalysisStart={() => { setIsAnalyzing(true); setError(''); }}
                />
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="py-12 text-center animate-in fade-in duration-500">
              <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-6"></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">분석 중입니다...</h3>
              <p className="text-gray-500">잠시만 기다려주세요.<br />AI가 대화 내용을 열심히 듣고 있어요.</p>
            </div>
          )}

          {uploadSuccess && (
            <div className="py-12 text-center space-y-6 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl shadow-sm">
                🎉
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">전송 완료!</h3>
                <p className="text-gray-500">선생님께 녹음 파일이 안전하게 전달되었습니다.</p>
              </div>
              <button
                onClick={() => { setUploadSuccess(false); setError(''); }}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
              >
                새로운 대화 녹음하기
              </button>
            </div>
          )}
        </div>
      </main>

      <div className="text-center p-6 text-gray-400 text-xs">
        Data Flywheel System
      </div>
    </div>
  )
}