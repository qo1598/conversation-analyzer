'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { sessionAPI, recordingAPI } from '../../../../lib/supabase'
import ConversationAnalysis from '../../../components/ConversationAnalysis'
import AudioUploader from '../../../components/AudioUploader'

export default function TeacherSessionView() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.id

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRecording, setSelectedRecording] = useState(null)
  const [uploadingArchive, setUploadingArchive] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadSessionData()
  }, [sessionId])

  const loadSessionData = async () => {
    try {
      setLoading(true)
      const result = await sessionAPI.getSessionDetails(sessionId)
      if (result.success) {
        setSession(result.data)
        // 아카이브 모드이고 녹음이 있다면 첫 번째 녹음을 기본 선택
        if (result.data.type === 'archive' && result.data.recordings?.length > 0 && !selectedRecording) {
          setSelectedRecording(result.data.recordings[0])
        }
      } else {
        throw new Error(result.error || '세션을 찾을 수 없습니다.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleArchiveUpload = async (result, file) => {
    try {
      setUploadingArchive(true)
      const { success, error } = await recordingAPI.uploadRecording(sessionId, file, result)

      if (success) {
        await loadSessionData()
        alert('파일 분석 및 저장이 완료되었습니다.')
      } else {
        alert(`저장 실패: ${error}`)
      }
    } catch (err) {
      console.error('Archive upload error:', err)
      alert('오류가 발생했습니다.')
    } finally {
      setUploadingArchive(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(session.code)
    alert('코드가 복사되었습니다.')
  }

  const handleDeleteRecording = async (recordingId) => {
    if (confirm('이 녹음을 삭제하시겠습니까?')) {
      const result = await recordingAPI.deleteRecording(recordingId)
      if (result.success) {
        await loadSessionData()
        if (selectedRecording?.id === recordingId) setSelectedRecording(null)
      }
    }
  }

  if (!mounted || loading) return null;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col h-screen overflow-hidden">
      {/* 컴팩트 헤더 */}
      <header className="bg-white border-b border-gray-200 py-3 px-6 shadow-sm z-20 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/teacher/dashboard')} className="text-gray-400 hover:text-indigo-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          </button>

          <div>
            <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              {session.name}
              <span className="text-xs font-normal text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full">
                {new Date(session.created_at).toLocaleDateString()}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {session.type === 'archive' ? (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
              📂 파일 분석 모드
            </span>
          ) : (
            <div className="bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-indigo-100">
              <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">CODE</span>
              <span className="font-mono font-bold text-gray-800">{session.code}</span>
              <button onClick={handleCopyCode} className="text-indigo-400 hover:text-indigo-600 ml-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 메인 레이아웃 (Split View) */}
      <div className="flex flex-1 overflow-hidden">

        {/* 사이드바: 녹음 목록 */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 sticky top-0 backdrop-blur-sm z-10">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Recordings</h2>
            <p className="text-2xl font-bold text-indigo-900">{session.recordings?.length || 0}개</p>
          </div>

          <div className="flex-1 p-2 space-y-2">
            {session.recordings?.map((rec, idx) => (
              <div
                key={rec.id}
                onClick={() => setSelectedRecording(selectedRecording?.id === rec.id ? null : rec)}
                className={`p-3 rounded-xl cursor-pointer transition-all border group relative ${selectedRecording?.id === rec.id
                  ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                  : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                  }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-bold ${selectedRecording?.id === rec.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                    녹음 #{idx + 1}
                  </span>
                  {selectedRecording?.id === rec.id && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>}
                </div>
                <p className="text-xs text-gray-400 mb-2">
                  {new Date(rec.uploaded_at).toLocaleString()}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] bg-white border border-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                    분석 완료
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteRecording(rec.id); }}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}

            {(!session.recordings || session.recordings.length === 0) && (
              <div className="text-center py-10 text-gray-400 text-sm">
                녹음이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 메인: 분석 결과 뷰 */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">

          {/* 아카이브 모드: 업로드 섹션 */}
          {session.type === 'archive' && (
            <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-6 mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span>📂</span> 파일 업로드 분석
                </h2>
                {session.recording_date && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    녹음 일자: {new Date(session.recording_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <AudioUploader
                onAnalysisStart={() => { }}
                onAnalysisComplete={handleArchiveUpload}
                onError={(err) => alert(err)}
              />
              {uploadingArchive && (
                <div className="mt-4 text-center text-indigo-600 font-medium animate-pulse">
                  분석 결과를 저장하고 있습니다...
                </div>
              )}
            </div>
          )}

          {selectedRecording ? (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ConversationAnalysis
                data={{
                  transcript: selectedRecording.transcript,
                  speakers: selectedRecording.speakers,
                  analysis: selectedRecording.analysis
                }}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 opacity-60">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-6 text-4xl">
                👈
              </div>
              <p className="text-lg">왼쪽 목록에서 녹음을 선택하여<br />상세 분석 결과를 확인하세요.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}