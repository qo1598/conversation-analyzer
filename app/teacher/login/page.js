'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TeacherLogin() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!mounted) return
    
    setLoading(true)
    setError('')

    try {
      if (!isLogin) {
        // 회원가입 검증
        if (formData.password !== formData.confirmPassword) {
          setError('비밀번호가 일치하지 않습니다.')
          setLoading(false)
          return
        }
        if (formData.password.length < 6) {
          setError('비밀번호는 6자리 이상이어야 합니다.')
          setLoading(false)
          return
        }
      }

      // 임시 로그인 처리 (실제 구현시에는 백엔드 API 호출)
      if (isLogin) {
        // 로그인 로직
        if (formData.email && formData.password) {
          localStorage.setItem('teacher', JSON.stringify({
            email: formData.email,
            name: formData.name || formData.email.split('@')[0]
          }))
          router.push('/teacher/dashboard')
        } else {
          setError('이메일과 비밀번호를 입력해주세요.')
        }
      } else {
        // 회원가입 로직
        localStorage.setItem('teacher', JSON.stringify({
          email: formData.email,
          name: formData.name
        }))
        router.push('/teacher/dashboard')
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoHome = () => {
    if (mounted) {
      router.push('/')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <button
            onClick={handleGoHome}
            className="text-sm text-gray-600 hover:text-gray-800 mb-4 flex items-center mx-auto"
          >
            ← 홈으로 돌아가기
          </button>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">교사 계정</h1>
          <p className="text-gray-600">
            {isLogin ? '로그인하여 세션을 관리하세요' : '새 계정을 만들어보세요'}
          </p>
        </div>

        {/* 로그인/회원가입 폼 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-4 text-center font-medium border-b-2 ${
                isLogin
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-4 text-center font-medium border-b-2 ${
                !isLogin
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="홍길동"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="teacher@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!isLogin}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
            </button>
          </form>

          {isLogin && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                데모용 계정: 아무 이메일과 비밀번호로 로그인 가능
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 