'use client'

import { useState, useRef, useEffect } from 'react'

export default function AudioRecorder({ onRecordingComplete, onError, onAnalysisStart, sessionId }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const intervalRef = useRef(null)

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      
      streamRef.current = stream
      chunksRef.current = []
      
      // Daglo API가 지원하는 형식 중 브라우저가 지원하는 것 찾기
      const supportedTypes = [
        'audio/wav',
        'audio/mp3', 
        'audio/mp4',
        'audio/aac',
        'audio/flac',
        'audio/webm;codecs=opus' // 마지막 옵션으로 webm
      ];
      
      let selectedType = 'audio/webm;codecs=opus'; // 기본값
      let selectedMimeType = 'audio/webm';
      let selectedExtension = 'webm';
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          if (type.includes('wav')) {
            selectedMimeType = 'audio/wav';
            selectedExtension = 'wav';
          } else if (type.includes('mp3')) {
            selectedMimeType = 'audio/mp3';
            selectedExtension = 'mp3';
          } else if (type.includes('mp4')) {
            selectedMimeType = 'audio/mp4';
            selectedExtension = 'mp4';
          } else if (type.includes('aac')) {
            selectedMimeType = 'audio/aac';
            selectedExtension = 'aac';
          } else if (type.includes('flac')) {
            selectedMimeType = 'audio/flac';
            selectedExtension = 'flac';
          } else {
            selectedMimeType = 'audio/webm';
            selectedExtension = 'webm';
          }
          break;
        }
      }
      
      console.log('선택된 오디오 형식:', selectedType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedType
      })
      
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: selectedMimeType })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        
        // 선택된 형식을 저장 (업로드 시 사용)
        blob.selectedExtension = selectedExtension;
        setAudioBlob(blob);
        
        // 스트림 정리
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      setDuration(0)
      
      // 녹음 시간 카운터 시작
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)

    } catch (err) {
      console.error('마이크 접근 실패:', err)
      onError('마이크에 접근할 수 없습니다. 브라우저 설정을 확인해주세요.')
    }
  }

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
      clearInterval(intervalRef.current)
    }
  }

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
      
      // 카운터 재시작
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1)
      }, 1000)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      clearInterval(intervalRef.current)
    }
  }

  const uploadRecording = async () => {
    if (!audioBlob) return

    setIsUploading(true)
    
    // 분석 시작 콜백 호출
    if (onAnalysisStart) {
      onAnalysisStart()
    }
    
    try {
      console.log('1. Supabase에 파일 업로드 시작...')
      
      // 1단계: Supabase Storage에 직접 업로드
      const fileName = `session_${sessionId}_${Date.now()}.${audioBlob.selectedExtension || 'webm'}`
      const filePath = `temp/${fileName}`
      
      // 파일을 arrayBuffer로 변환
      const fileBuffer = await audioBlob.arrayBuffer()
      
      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await window.supabase?.storage
        ?.from('recordings')
        ?.upload(filePath, fileBuffer, {
          contentType: audioBlob.type || 'audio/webm'
        })
      
      // Supabase가 없으면 fileAPI 사용
      let uploadResult
      if (!window.supabase) {
        // fileAPI 사용 (동적 import)
        const { fileAPI } = await import('../../lib/supabase')
        uploadResult = await fileAPI.uploadTempFile(audioBlob)
        
        if (!uploadResult.success) {
          throw new Error(`파일 업로드 실패: ${uploadResult.error}`)
        }
      } else {
        if (uploadError) {
          throw new Error(`파일 업로드 실패: ${uploadError.message}`)
        }
        
        // 공개 URL 생성
        const { data: { publicUrl } } = window.supabase.storage
          .from('recordings')
          .getPublicUrl(uploadData.path)
        
        uploadResult = {
          success: true,
          data: {
            path: uploadData.path,
            url: publicUrl
          }
        }
      }
      
      console.log('2. 파일 업로드 완료, 분석 API 호출...')
      
      // 2단계: 분석 API 호출 (JSON 방식)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          audioUrl: uploadResult.data.url,
          filePath: uploadResult.data.path
        })
      })

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.status === 'processing' && data.rid) {
        console.log('3. 분석 요청 성공, RID:', data.rid)
        
        // 3단계: 폴링으로 결과 확인
        const result = await pollForResults(data.rid, data.filePath)
        
        if (result) {
          // 분석 결과만 전달 (API에서 파일 처리 완료)
          onRecordingComplete(result)
          
          // 녹음 데이터 초기화
          resetRecording()
        } else {
          throw new Error('분석 결과를 받지 못했습니다.')
        }
      } else {
        throw new Error(data.error || '분석 요청 실패')
      }
      
    } catch (err) {
      console.error('업로드 오류:', err)
      onError(`녹음 파일 업로드 중 오류가 발생했습니다: ${err.message}`)
    } finally {
      setIsUploading(false)
    }
  }

  // 폴링으로 결과 확인
  const pollForResults = async (rid, filePath) => {
    const maxRetries = 30 // 최대 5분 대기
    const retryInterval = 10000 // 10초마다 확인
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`결과 확인 중... (${i + 1}/${maxRetries})`)
        
        const response = await fetch(`/api/analyze-status?rid=${rid}&filePath=${filePath}`)
        
        if (!response.ok) {
          throw new Error(`상태 확인 오류: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.status === 'completed') {
          console.log('분석 완료!')
          return data
        } else if (data.status === 'error') {
          throw new Error(data.error)
        }
        
        // 아직 처리 중이면 대기
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryInterval))
        }
        
      } catch (error) {
        console.error('폴링 오류:', error)
        throw error
      }
    }
    
    throw new Error('분석 시간이 너무 오래 걸립니다. 더 짧은 파일을 사용해보세요.')
  }

  const resetRecording = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    chunksRef.current = []
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-center">실시간 녹음</h3>
      
      {/* 녹음 시간 표시 */}
      <div className="text-center mb-6">
        <div className="text-2xl font-mono font-bold text-gray-800">
          {formatTime(duration)}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {isRecording && !isPaused && '녹음 중...'}
          {isPaused && '일시정지'}
          {!isRecording && duration > 0 && '녹음 완료'}
          {!isRecording && duration === 0 && '녹음 준비'}
        </div>
      </div>

      {/* 녹음 컨트롤 버튼 */}
      <div className="flex justify-center items-center space-x-3 mb-6">
        {!isRecording && duration === 0 && (
          <button
            onClick={startRecording}
            className="w-12 h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
          >
            🎤
          </button>
        )}

        {isRecording && !isPaused && (
          <>
            <button
              onClick={pauseRecording}
              className="w-10 h-10 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center transition-colors"
            >
              ⏸️
            </button>
            <button
              onClick={stopRecording}
              className="w-12 h-12 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
            >
              ⏹️
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button
              onClick={resumeRecording}
              className="w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
            >
              ▶️
            </button>
            <button
              onClick={stopRecording}
              className="w-12 h-12 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
            >
              ⏹️
            </button>
          </>
        )}
      </div>

      {/* 녹음 완료 후 미리보기 및 업로드 */}
      {audioUrl && !isRecording && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">녹음 미리보기</h4>
            <audio controls className="w-full" src={audioUrl}>
              브라우저가 오디오 재생을 지원하지 않습니다.
            </audio>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={resetRecording}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              다시 녹음
            </button>
            <button
              onClick={uploadRecording}
              disabled={isUploading}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? '업로드 중...' : '업로드'}
            </button>
          </div>
        </div>
      )}

      {/* 브라우저 호환성 안내 */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        <p>Chrome, Firefox, Safari 등 최신 브라우저에서 사용 가능합니다.</p>
      </div>
    </div>
  )
} 