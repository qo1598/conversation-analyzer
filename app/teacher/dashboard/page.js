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
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkAuthAndLoadData()
  }, [router])

  const checkAuthAndLoadData = async () => {
    // 로그인 체크
    const { success, data } = await authAPI.getCurrentUser()
    if (!success || !data) {
      router.push('/teacher/login')
      return
    }
    
    setTeacher(data)

    // 세션 데이터 불러오기
    await loadSessions()
  }

  const loadSessions = async () => {
    const { success, data } = await sessionAPI.getTeacherSessions()
    if (success) {
      setSessions(data || [])
    } else {
      console.error('세션 로드 실패')
    }
  }

  const createSession = async () => {
    if (!newSessionName.trim()) {
      alert('세션 이름을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const { success, data, error } = await sessionAPI.createSession(newSessionName)
      
      if (success) {
        await loadSessions() // 세션 목록 새로고침
        setNewSessionName('')
        setShowCreateModal(false)
        alert(`세션이 생성되었습니다! 코드: ${data.code}`)
      } else {
        alert(`세션 생성 실패: ${error}`)
      }
    } catch (error) {
      console.error('세션 생성 오류:', error)
      alert('세션 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const deleteSession = async (sessionId) => {
    if (confirm('정말로 이 세션을 삭제하시겠습니까?')) {
      const { success } = await sessionAPI.deleteSession(sessionId)
      if (success) {
        await loadSessions() // 세션 목록 새로고침
      } else {
        alert('세션 삭제에 실패했습니다.')
      }
    }
  }

  const logout = async () => {
    await authAPI.signOut()
    if (mounted) {
      router.push('/')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('세션 코드가 클립보드에 복사되었습니다!')
  }

  const navigateToSession = (sessionId) => {
    if (mounted) {
      router.push(`/teacher/session/${sessionId}`)
    }
  }

  if (!mounted || !teacher) {
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
              <h1 className="text-2xl font-bold text-gray-900">교사 대시보드</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">안녕하세요, {teacher.name}님</span>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-800"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                  📊
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">전체 세션</dt>
                  <dd className="text-lg font-medium text-gray-900">{sessions.length}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center">
                  ✅
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">활성 세션</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {sessions.filter(s => s.status === 'active').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-purple-500 rounded-md flex items-center justify-center">
                  🎤
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">총 녹음</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {sessions.reduce((total, session) => total + (session.recordings?.length || 0), 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 파일 업로드 분석 섹션 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">파일 업로드 분석</h3>
                <p className="text-sm text-gray-600">
                  기존에 녹음된 파일을 업로드하여 AI 분석을 받을 수 있습니다. 
                  세션과 별개로 개별 파일을 분석하고 싶을 때 사용하세요.
                </p>
              </div>
              <div className="ml-6">
                <button
                  onClick={() => {
                    if (mounted) {
                      router.push('/legacy')
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md text-blue-600 hover:text-blue-800 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  📁 파일 업로드
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 세션 목록 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">내 세션</h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                ➕ 새 세션 만들기
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-gray-400 text-4xl">📝</div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">세션이 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500">새 세션을 만들어 시작해보세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {sessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{session.name}</h4>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <span className="mr-4">
                            코드: <span className="font-mono font-bold text-lg text-blue-600">{session.code}</span>
                          </span>
                          <span className="mr-4">
                            생성일: {new Date(session.created_at).toLocaleDateString()}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            session.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status === 'active' ? '활성' : '비활성'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(session.code)}
                          className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800"
                          title="코드 복사"
                        >
                          복사
                        </button>
                        <button
                          onClick={() => navigateToSession(session.id)}
                          className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          관리
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 세션 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">새 세션 만들기</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  세션 이름
                </label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="예: 1학년 1반 토론 활동"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  onClick={createSession}
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? '생성 중...' : '생성'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 