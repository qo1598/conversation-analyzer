'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI, sessionAPI } from '../../../lib/supabase'

export default function TeacherDashboard() {
  const router = useRouter()
  const [teacher, setTeacher] = useState(null)
  const [sessions, setSessions] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [sessionType, setSessionType] = useState('live') // 'live' or 'archive'
  const [recordingDate, setRecordingDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkAuthAndLoadData()
  }, [router])

  const checkAuthAndLoadData = async () => {
    const { success, data } = await authAPI.getCurrentUser()
    if (!success || !data) {
      router.push('/teacher/login')
      return
    }
    setTeacher(data)
    await loadSessions()
  }

  const loadSessions = async () => {
    const { success, data } = await sessionAPI.getTeacherSessions()
    if (success) setSessions(data || [])
  }

  const createSession = async () => {
    if (!newSessionName.trim()) {
      alert('세션 이름을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const { success, data, error } = await sessionAPI.createSession(newSessionName, sessionType, recordingDate)
      if (success) {
        await loadSessions()
        setNewSessionName('')
        setShowCreateModal(false)
        alert(`세션이 생성되었습니다! 코드: ${data.code}`)
      } else {
        alert(`세션 생성 실패: ${error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const deleteSession = async (sessionId) => {
    if (confirm('정말로 이 세션을 삭제하시겠습니까?')) {
      const { success } = await sessionAPI.deleteSession(sessionId)
      if (success) await loadSessions()
    }
  }

  const logout = async () => {
    await authAPI.signOut()
    if (mounted) router.push('/')
  }

  const navigateToSession = (sessionId) => {
    if (mounted) router.push(`/teacher/session/${sessionId}`)
  }

  if (!mounted || !teacher) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* 상단 헤더 (배경 그라데이션) */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 pb-32">
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">🎙️</span> 대화 분석 시스템
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-indigo-100 text-sm font-medium bg-indigo-500/30 px-3 py-1 rounded-full backdrop-blur-sm">
                {teacher.name} 선생님
              </span>
              <button
                onClick={logout}
                className="text-sm text-indigo-100 hover:text-white transition-colors font-medium"
              >
                로그아웃
              </button>
            </div>
          </div>
        </header>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: '전체 세션', value: sessions.length, icon: '📊', color: 'bg-blue-500' },
            { label: '활성 세션', value: sessions.filter(s => s.status === 'active').length, icon: '✅', color: 'bg-green-500' },
            { label: '누적 분석', value: sessions.reduce((t, s) => t + (s.recordings?.length || 0), 0), icon: '📈', color: 'bg-purple-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg shadow-indigo-100 border border-white p-6 flex items-center transform transition-transform hover:-translate-y-1 duration-300">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-xl text-white shadow-md`}>
                {stat.icon}
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
            </div>
          ))}

        </div>

        {/* 메인 컨텐츠 영역 */}
        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 overflow-hidden min-h-[500px]">
          <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">나의 수업 세션</h2>
              <p className="text-gray-500 text-sm mt-1">
                생성한 수업 세션을 관리하고 분석 결과를 확인하세요.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex items-center gap-2"
            >
              <span>➕</span> 새 세션 만들기
            </button>
          </div>

          <div className="p-8">
            {sessions.length === 0 ? (
              <div className="text-center py-20 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                <div className="text-6xl mb-4 opacity-20">📝</div>
                <h3 className="text-lg font-medium text-gray-900">아직 세션이 없습니다</h3>
                <p className="text-gray-500 mt-2 mb-6">새로운 수업 세션을 만들어 분석을 시작해보세요.</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  세션 생성하기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((session) => (
                  <div key={session.id} className="group bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-indigo-100/50 hover:border-indigo-200 transition-all cursor-pointer relative" onClick={() => navigateToSession(session.id)}>
                    <div className="flex justify-between items-start mb-4">
                      {session.type === 'archive' ? (
                        <div className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                          📂 기존 파일 분석
                        </div>
                      ) : (
                        <div className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                          🎤 실시간 수업
                        </div>
                      )}
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(session.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-800 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {session.name}
                    </h3>

                    {session.type === 'archive' ? (
                      <div className="bg-gray-50 rounded-lg p-3 mb-6 flex items-center justify-between group-hover:bg-purple-50/50 transition-colors">
                        <span className="text-xs text-gray-500">녹음 일자</span>
                        <span className="text-sm font-medium text-gray-700">
                          {session.recording_date ? new Date(session.recording_date).toLocaleDateString() : '-'}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-3 mb-6 flex items-center justify-between group-hover:bg-indigo-50/50 transition-colors">
                        <span className="text-xs text-gray-500">입장 코드</span>
                        <span className="text-lg font-mono font-bold text-indigo-600 tracking-wider btn-copy">
                          {session.code}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span>{session.type === 'archive' ? '💾' : '🎤'}</span> 녹음 {session.recordings?.length || 0}개
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                        <button className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                          입장하기 →
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">새 세션 만들기</h3>
            <div className="mb-6 space-y-4">
              {/* 세션 유형 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">세션 유형</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setSessionType('live')}
                    className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${sessionType === 'live' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <span>🎤</span>
                    <span className="font-medium">실시간 수업</span>
                  </button>
                  <button
                    onClick={() => setSessionType('archive')}
                    className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 ${sessionType === 'archive' ? 'border-purple-500 bg-purple-50 text-purple-700 ring-1 ring-purple-500' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                  >
                    <span>📂</span>
                    <span className="font-medium">기존 파일 분석</span>
                  </button>
                </div>
              </div>

              {/* 세션 이름 입력 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  세션 이름
                </label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-300"
                  placeholder="예: 2024 국어 토론 수업"
                  autoFocus
                />
              </div>

              {/* 녹음 날짜 선택 (아카이브 모드일 때만) */}
              {sessionType === 'archive' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    녹음 날짜
                  </label>
                  <input
                    type="date"
                    value={recordingDate}
                    onChange={(e) => setRecordingDate(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                취소
              </button>
              <button
                onClick={createSession}
                disabled={loading}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                {loading ? '생성 중...' : '세션 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}