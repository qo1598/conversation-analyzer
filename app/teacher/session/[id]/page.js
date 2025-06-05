'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ConversationAnalysis from '../../../components/ConversationAnalysis'

export default function TeacherSessionView() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id
  
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRecording, setSelectedRecording] = useState(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // 세션 정보 불러오기
    const findSession = () => {
      const savedSessions = localStorage.getItem('sessions')
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions)
        const foundSession = sessions.find(s => s.id === sessionId)
        
        if (foundSession) {
          setSession(foundSession)
        } else {
          setError('세션을 찾을 수 없습니다.')
        }
      } else {
        setError('세션 데이터가 없습니다.')
      }
      setLoading(false)
    }

    if (sessionId) {
      findSession()
    }
  }, [sessionId])

  const handleBackToDashboard = () => {
    if (mounted) {
      router.push('/teacher/dashboard')
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.code)
    alert('세션 코드가 클립보드에 복사되었습니다!')
  }

  const handleDeleteRecording = (recordingId) => {
    if (confirm('이 녹음을 삭제하시겠습니까?')) {
      const savedSessions = localStorage.getItem('sessions')
      if (savedSessions) {
        const sessions = JSON.parse(savedSessions)
        const updatedSessions = sessions.map(s => {
          if (s.id === sessionId) {
            return {
              ...s,
              recordings: s.recordings.filter(r => r.id !== recordingId)
            }
          }
          return s
        })
        localStorage.setItem('sessions', JSON.stringify(updatedSessions))
        
        // 세션 정보 업데이트
        const updatedSession = updatedSessions.find(s => s.id === sessionId)
        setSession(updatedSession)
        
        // 선택된 녹음이 삭제된 경우 선택 해제
        if (selectedRecording && selectedRecording.id === recordingId) {
          setSelectedRecording(null)
        }
      }
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">세션을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">오류 발생</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleBackToDashboard}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              대시보드로 돌아가기
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={handleBackToDashboard}
                className="text-sm text-gray-600 hover:text-gray-800 mr-4"
              >
                ← 대시보드
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{session.name}</h1>
                <p className="text-sm text-gray-600">
                  세션 코드: 
                  <span className="font-mono font-bold text-blue-600 ml-1">{session.code}</span>
                  <button
                    onClick={handleCopyCode}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    📋 복사
                  </button>
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              생성일: {new Date(session.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 녹음 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">녹음 목록</h2>
                <span className="text-sm text-gray-500">
                  총 {session.recordings?.length || 0}개
                </span>
              </div>
              
              {session.recordings && session.recordings.length > 0 ? (
                <div className="space-y-3">
                  {session.recordings.map((recording, index) => (
                    <div
                      key={recording.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedRecording?.id === recording.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedRecording(recording)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">
                            녹음 #{index + 1}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {new Date(recording.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteRecording(recording.id)
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🎤</div>
                  <p className="text-gray-500">아직 녹음이 없습니다</p>
                  <p className="text-sm text-gray-400 mt-2">
                    학생들이 녹음을 업로드하면 여기에 표시됩니다
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 분석 결과 */}
          <div className="lg:col-span-2">
            {selectedRecording ? (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">
                      녹음 #{session.recordings.findIndex(r => r.id === selectedRecording.id) + 1} 분석 결과
                    </h2>
                    <div className="text-sm text-gray-500">
                      {new Date(selectedRecording.timestamp).toLocaleString()}
                    </div>
                  </div>
                  
                  <ConversationAnalysis data={selectedRecording.result} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center py-16">
                  <div className="text-4xl mb-4">👈</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    녹음을 선택하세요
                  </h3>
                  <p className="text-gray-500">
                    왼쪽 목록에서 녹음을 선택하면 분석 결과를 확인할 수 있습니다
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 