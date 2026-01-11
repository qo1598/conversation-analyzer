import { createClient } from '@supabase/supabase-js'

// 올바른 Supabase URL로 수정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgxbtjxxqjmgemtoyauh.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJ0anh4cWptZ2VtdG95YXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NjcxMTMsImV4cCI6MjA1MjM0MzExM30.3cJBpIzJqBBrfzxQNKGJJQWjPKzFbGRiKuWKfVEqDqk'

// 디버그 로그 추가
console.log('Supabase 환경변수 체크:', {
  url: supabaseUrl ? '설정됨' : '설정되지 않음',
  key: supabaseAnonKey ? '설정됨' : '설정되지 않음',
  urlLength: supabaseUrl?.length,
  keyLength: supabaseAnonKey?.length,
  actualUrl: supabaseUrl,
  actualKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
})

// 환경변수 체크를 경고로만 변경 (배포 시 문제 해결을 위해)
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL_HERE' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
  const warning = `Supabase 환경변수 누락 또는 기본값: URL=${supabaseUrl ? '있음' : '없음'}, KEY=${supabaseAnonKey ? '있음' : '없음'}`
  console.warn(warning)
  // 기본값으로 계속 진행 (임시 조치)
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

      // teachers 테이블에 정보 저장 (이메일 인증 상태와 관계없이)
      if (authData.user) {
        console.log('teachers 테이블에 정보 저장 시도...')

        // Service role key를 사용하여 RLS 우회하여 삽입
        const { error: dbError } = await supabase
          .from('teachers')
          .insert([{
            id: authData.user.id,
            email,
            name,
            password_hash: 'handled_by_auth'
          }])

        console.log('teachers 테이블 저장 결과:', { dbError })

        // 이메일 인증이 필요한 경우에도 성공으로 처리
        if (dbError && !dbError.message.includes('email_confirmation_required')) {
          throw dbError
        }
      }

      console.log('회원가입 성공')
      return {
        success: true,
        data: authData,
        needsEmailConfirmation: !authData.user?.email_confirmed_at
      }
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
  async createSession(name, type = 'live', recordingDate = null) {
    try {
      // 현재 로그인된 사용자 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('로그인이 필요합니다.')
      }

      const { data, error } = await supabase
        .from('sessions')
        .insert([{
          name,
          teacher_id: user.id,
          type,
          recording_date: recordingDate
        }])
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
      console.log('=== getTeacherSessions 시작 ===')

      // 현재 로그인된 사용자 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('로그인이 필요합니다.')
      }

      console.log('현재 사용자 ID:', user.id)

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
        .eq('teacher_id', user.id)  // 현재 교사의 세션만 조회
        .order('created_at', { ascending: false })

      console.log('Supabase 쿼리 결과:', { data, error })

      if (data) {
        console.log('세션별 녹음 개수:', data.map(session => ({
          sessionId: session.id,
          sessionName: session.name,
          recordingsCount: session.recordings?.length || 0,
          recordings: session.recordings
        })))
      }

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('=== getTeacherSessions 오류 ===', error)
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
      // 현재 로그인된 사용자 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('로그인이 필요합니다.')
      }

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
      console.log('=== getSessionDetails 시작 ===')
      console.log('요청된 sessionId:', sessionId)

      // 현재 로그인된 사용자 확인
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('로그인이 필요합니다.')
      }

      console.log('현재 사용자 ID:', user.id)

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

      console.log('=== getSessionDetails 쿼리 결과 ===')
      console.log('data:', data)
      console.log('error:', error)

      if (data) {
        console.log('세션 정보:', {
          sessionId: data.id,
          sessionName: data.name,
          teacherId: data.teacher_id,
          recordingsCount: data.recordings?.length || 0,
          recordings: data.recordings
        })
      }

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('=== getSessionDetails 오류 ===', error)
      return { success: false, error: error.message }
    }
  }
}

// 녹음 관리 함수들
export const recordingAPI = {
  // 녹음 파일 업로드
  async uploadRecording(sessionId, audioFile, analysisResult) {
    try {
      console.log('=== recordingAPI.uploadRecording 시작 ===')
      console.log('sessionId:', sessionId)
      console.log('audioFile:', !!audioFile)
      console.log('analysisResult:', {
        hasTranscript: !!analysisResult?.transcript,
        transcriptType: typeof analysisResult?.transcript,
        transcriptLength: analysisResult?.transcript?.length,
        hasSpeakers: !!analysisResult?.speakers,
        speakersType: typeof analysisResult?.speakers,
        speakersKeys: Object.keys(analysisResult?.speakers || {}),
        hasAnalysis: !!analysisResult?.analysis,
        analysisType: typeof analysisResult?.analysis
      })

      let filePath = 'no-file'; // 기본값 설정
      let fileSize = 0;

      // 파일이 있는 경우에만 Storage에 업로드
      if (audioFile) {
        console.log('파일 업로드 시작...')
        // 1. 파일을 Supabase Storage에 업로드
        const fileName = `${sessionId}/${Date.now()}-${audioFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('recordings')
          .upload(fileName, audioFile)

        if (uploadError) {
          console.error('Storage 업로드 오류:', uploadError)
          throw uploadError
        }

        filePath = uploadData.path;
        fileSize = audioFile.size;
        console.log('파일 업로드 완료:', filePath)
      } else {
        console.log('파일 없음, 분석 결과만 저장')
      }

      // 2. 녹음 메타데이터를 데이터베이스에 저장
      const insertData = {
        session_id: sessionId,
        file_path: filePath,
        file_size: fileSize,
        transcript: analysisResult?.transcript || [],
        speakers: analysisResult?.speakers || {},
        analysis: analysisResult?.analysis || {}
      }

      console.log('=== 데이터베이스 삽입 데이터 ===')
      console.log('insertData:', JSON.stringify(insertData, null, 2))

      const { data: recordingData, error: recordingError } = await supabase
        .from('recordings')
        .insert([insertData])
        .select()
        .single()

      if (recordingError) {
        console.error('데이터베이스 삽입 오류:', recordingError)
        throw recordingError
      }

      console.log('=== 데이터베이스 저장 완료 ===')
      console.log('저장된 데이터:', recordingData)

      return { success: true, data: recordingData }
    } catch (error) {
      console.error('=== uploadRecording 오류 ===', error)
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

// 파일 업로드 API
export const fileAPI = {
  // 임시 파일 업로드 (Legacy 페이지용)
  uploadTempFile: async (file) => {
    try {
      console.log('임시 파일 업로드 시작:', file.name)

      // 파일을 arrayBuffer로 변환
      const fileBuffer = await file.arrayBuffer()

      // 파일 확장자 추출
      const fileExt = file.name ? `.${file.name.split('.').pop()}` : '.webm'
      const fileName = `temp_${Date.now()}${fileExt}`
      const filePath = `temp/${fileName}`

      // Supabase Storage에 업로드
      const { data, error } = await supabase.storage
        .from('recordings')
        .upload(filePath, fileBuffer, {
          contentType: file.type || 'audio/webm'
        })

      if (error) {
        console.error('파일 업로드 실패:', error)
        return { success: false, error: error.message }
      }

      // 공개 URL 생성
      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(data.path)

      console.log('임시 파일 업로드 완료:', publicUrl)

      return {
        success: true,
        data: {
          path: data.path,
          url: publicUrl
        }
      }

    } catch (error) {
      console.error('파일 업로드 오류:', error)
      return { success: false, error: error.message }
    }
  },

  // 임시 파일 삭제
  deleteTempFile: async (filePath) => {
    try {
      const { error } = await supabase.storage
        .from('recordings')
        .remove([filePath])

      if (error) {
        console.error('임시 파일 삭제 실패:', error)
        return { success: false, error: error.message }
      }

      return { success: true }

    } catch (error) {
      console.error('임시 파일 삭제 오류:', error)
      return { success: false, error: error.message }
    }
  }
} 