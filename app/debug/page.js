'use client'

import { useEffect, useState } from 'react'

export default function DebugPage() {
  const [envVars, setEnvVars] = useState({})

  useEffect(() => {
    setEnvVars({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '설정됨 (길이: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : '설정되지 않음'
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">환경변수 디버그</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Supabase 환경변수</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">NEXT_PUBLIC_SUPABASE_URL</label>
              <div className="mt-1 p-3 bg-gray-50 rounded border">
                {envVars.NEXT_PUBLIC_SUPABASE_URL || '설정되지 않음'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">NEXT_PUBLIC_SUPABASE_ANON_KEY</label>
              <div className="mt-1 p-3 bg-gray-50 rounded border">
                {envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || '설정되지 않음'}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">테스트 요청</h3>
            <button
              onClick={async () => {
                try {
                  const response = await fetch(envVars.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', {
                    headers: {
                      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    }
                  })
                  console.log('Supabase 연결 테스트:', response.status, response.statusText)
                  alert(`응답: ${response.status} ${response.statusText}`)
                } catch (error) {
                  console.error('연결 오류:', error)
                  alert(`오류: ${error.message}`)
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Supabase 연결 테스트
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 