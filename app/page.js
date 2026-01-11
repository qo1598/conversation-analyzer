'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [sessionCode, setSessionCode] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleTeacherLogin = () => {
    if (mounted) router.push('/teacher/login')
  }

  const handleStudentJoin = () => {
    if (sessionCode.length === 6 && mounted) {
      router.push(`/student/${sessionCode}`)
    } else {
      alert('6자리 세션 코드를 입력해주세요.')
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-indigo-400 font-medium animate-pulse">시스템 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">

      {/* 헤더 섹션 */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
          학습 분석 시스템
        </h1>
      </div>

      {/* 카드 섹션 */}
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl">
        <div className="grid md:grid-cols-2 gap-6 px-4 sm:px-0">

          {/* 교사용 카드 */}
          <div className="group bg-white overflow-hidden rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1 flex flex-col">
            <div className="p-8 flex flex-col h-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">교사/관리자</h2>
              <p className="text-gray-500 mb-8 h-12">
                새로운 분석 세션을 생성하고<br />학생들의 대화 리포트를 확인하세요.
              </p>
              <button
                onClick={handleTeacherLogin}
                className="w-full mt-auto flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <p>교사 로그인</p>
              </button>
            </div>
          </div>

          {/* 학생용 카드 */}
          <div className="group bg-white overflow-hidden rounded-3xl shadow-xl shadow-indigo-100/50 border border-gray-100 hover:border-green-200 transition-all duration-300 hover:-translate-y-1 flex flex-col">
            <div className="p-8 flex flex-col h-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">학생/참여자</h2>
              <p className="text-gray-500 mb-8 h-12">
                공유받은 6자리 세션 코드를 입력하고<br />대화 분석에 참여하세요.
              </p>
              <div className="space-y-4 mt-auto">
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="block w-full px-4 py-3.5 border border-gray-200 rounded-xl text-center text-xl font-mono tracking-[0.5em] placeholder-gray-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  maxLength={6}
                />
                <button
                  onClick={handleStudentJoin}
                  disabled={sessionCode.length !== 6}
                  className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white transition-colors ${sessionCode.length === 6
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-300 cursor-not-allowed'
                    }`}
                >
                  세션 입장
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}