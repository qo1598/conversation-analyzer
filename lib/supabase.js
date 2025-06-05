import { createClient } from '@supabase/supabase-js'

// 올바른 Supabase URL로 수정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgxbtjxxqjmgemtoyauh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'

// 디버그 로그 추가
console.log('Supabase 환경변수 체크:', {
  url: supabaseUrl ? '설정됨' : '설정되지 않음',
  key: supabaseAnonKey ? '설정됨' : '설정되지 않음',
  urlLength: supabaseUrl?.length,
  keyLength: supabaseAnonKey?.length,
  actualUrl: supabaseUrl,
  actualKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
})

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL_HERE' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
  const error = `Supabase 환경변수 누락 또는 기본값: URL=${supabaseUrl ? '있음' : '없음'}, KEY=${supabaseAnonKey ? '있음' : '없음'}`
  console.error(error)
  throw new Error(error)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// 교사 인증 관련 함수들
export const authAPI = {
  // 교사 회원가입
  async signUp(email, password, name) {
    try {
      console.log('회원가입 시작:', { email, name })
      
      // Supabase Auth에 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name
          }
        }
      })

      console.log('Supabase Auth 결과:', { authData, authError })

      if (authError) throw authError

      // teachers 테이블에 정보 저장
      if (authData.user) {
        console.log('teachers 테이블에 정보 저장 시도...')
        
        const { error: dbError } = await supabase
          .from('teachers')
          .insert([{
            id: authData.user.id,
            email,
            name,
            password_hash: 'handled_by_auth'
          }])

        console.log('teachers 테이블 저장 결과:', { dbError })

        if (dbError) throw dbError
      }

      console.log('회원가입 성공')
      return { success: true, data: authData }
    } catch (error) {
      console.error('회원가입 오류:', error)
      return { success: false, error: error.message }
    }
  },

  // 교사 로그인
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // 로그아웃
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // 현재 로그인된 사용자 정보
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error

      if (user) {
        // teachers 테이블에서 추가 정보 가져오기
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', user.id)
          .single()

        if (teacherError) throw teacherError

        return { success: true, data: { ...user, ...teacherData } }
      }

      return { success: false, error: '로그인되지 않음' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// 세션 관리 함수들
export const sessionAPI = {
  // 새 세션 생성
  async createSession(name) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([{ name }])
        .select()
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // 교사의 모든 세션 조회
  async getTeacherSessions() {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          recordings (
            id,
            file_size,
            duration,
            uploaded_at
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // 세션 코드로 세션 찾기 (학생용)
  async getSessionByCode(code) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code)
        .eq('status', 'active')
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // 세션 삭제
  async deleteSession(sessionId) {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // 세션 상세 정보 (녹음 포함)
  async getSessionDetails(sessionId) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          recordings (
            id,
            file_path,
            file_size,
            duration,
            transcript,
            speakers,
            analysis,
            uploaded_at
          )
        `)
        .eq('id', sessionId)
        .single()

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
}

// 녹음 관리 함수들
export const recordingAPI = {
  // 녹음 파일 업로드
  async uploadRecording(sessionId, audioFile, analysisResult) {
    try {
      // 1. 파일을 Supabase Storage에 업로드
      const fileName = `${sessionId}/${Date.now()}-${audioFile.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioFile)

      if (uploadError) throw uploadError

      // 2. 녹음 메타데이터를 데이터베이스에 저장
      const { data: recordingData, error: recordingError } = await supabase
        .from('recordings')
        .insert([{
          session_id: sessionId,
          file_path: uploadData.path,
          file_size: audioFile.size,
          transcript: analysisResult.transcript,
          speakers: analysisResult.speakers,
          analysis: analysisResult.analysis
        }])
        .select()
        .single()

      if (recordingError) throw recordingError

      return { success: true, data: recordingData }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // 녹음 삭제
  async deleteRecording(recordingId) {
    try {
      // 1. 데이터베이스에서 파일 경로 가져오기
      const { data: recording, error: fetchError } = await supabase
        .from('recordings')
        .select('file_path')
        .eq('id', recordingId)
        .single()

      if (fetchError) throw fetchError

      // 2. Storage에서 파일 삭제
      const { error: storageError } = await supabase.storage
        .from('recordings')
        .remove([recording.file_path])

      if (storageError) throw storageError

      // 3. 데이터베이스에서 레코드 삭제
      const { error: dbError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recordingId)

      if (dbError) throw dbError

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // 녹음 파일 다운로드 URL 생성
  async getRecordingUrl(filePath) {
    try {
      const { data, error } = await supabase.storage
        .from('recordings')
        .createSignedUrl(filePath, 3600) // 1시간 유효

      if (error) throw error

      return { success: true, url: data.signedUrl }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
} 