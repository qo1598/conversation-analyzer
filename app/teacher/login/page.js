'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '../../../lib/supabase'

export default function TeacherLogin() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('') // 초기값 빈 문자열
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isLogin) {
        // 로그인
        const { success, error } = await authAPI.signIn(email, password)
        if (success) {
          router.push('/teacher/dashboard')
        } else {
          alert('로그인 실패: ' + error)
        }
      } else {
        // 회원가입
        const { success, error, needsEmailConfirmation } = await authAPI.signUp(email, password, name)
        if (success) {
          if (needsEmailConfirmation) {
            alert('회원가입이 완료되었습니다. 이메일을 확인하여 인증해주세요.')
          } else {
            alert('회원가입이 완료되었습니다. 로그인해주세요.')
            setIsLogin(true)
          }
        } else {
          alert('회원가입 실패: ' + error)
        }
      }
    } catch (error) {
      console.error('인증 오류:', error)
      alert('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 렌더링 전에는 아무것도 보여주지 않음 (Hydration 오류 방지)
  if (!mounted) return null;

  return (
    <div className="min-h-screen flex bg-white">
      {/* 왼쪽 브랜딩 섹션 (모바일 숨김) */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-600 to-violet-700 items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-400 opacity-20 rounded-full blur-3xl -ml-20 -mb-20"></div>

        <div className="text-center text-white p-12 relative z-10">
          <div className="text-6xl mb-6">🎙️</div>
          <h2 className="text-4xl font-bold mb-4">대화 분석 시스템</h2>
          <p className="text-indigo-100 text-lg max-w-md mx-auto leading-relaxed">
            AI 기반의 정밀한 화자 분리와<br />심층적인 대화 패턴 분석을 경험해보세요.
          </p>
        </div>
      </div>

      {/* 오른쪽 폼 섹션 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              {isLogin ? '선생님, 환영합니다!' : '계정 만들기'}
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              {isLogin ? '계정에 로그인하여 시작하세요.' : '새로운 분석 여정을 시작해보세요.'}
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="홍길동"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                이메일 주소
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="teacher@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-indigo-200"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? '로그인하기' : '회원가입하기'
              )}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-medium text-indigo-600 hover:text-indigo-500 text-sm transition-colors"
            >
              {isLogin
                ? '아직 계정이 없으신가요? 회원가입'
                : '이미 계정이 있으신가요? 로그인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
