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
    if (mounted) {
      router.push('/teacher/login')
    }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            대화 분석 시스템
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            실시간 녹음과 AI 분석으로 더 나은 소통을 만들어보세요
          </p>
        </div>

        {/* 메인 카드들 */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* 교사용 카드 */}
          <div className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                👨‍🏫
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">교사</h2>
              <p className="text-gray-600 mb-4 text-sm">
                세션을 생성하고 학생들의 대화를 분석하세요
              </p>
              <button
                onClick={handleTeacherLogin}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                교사 로그인
              </button>
            </div>
          </div>

          {/* 학생용 카드 */}
          <div className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                👥
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-3">학생</h2>
              <p className="text-gray-600 mb-4 text-sm">
                세션 코드를 입력하여 대화에 참여하세요
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={sessionCode}
                  onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6자리 코드"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center text-lg font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  maxLength={6}
                />
                <button
                  onClick={handleStudentJoin}
                  disabled={sessionCode.length !== 6}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    sessionCode.length === 6
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}
                >
                  세션 참여
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 