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
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        
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
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('업로드 실패')
      }

      const result = await response.json()
      
      // 분석 결과와 함께 audioBlob도 전달
      onRecordingComplete({
        ...result,
        audioBlob: audioBlob,
        audioFile: new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
      })
      
      // 녹음 데이터 초기화
      resetRecording()
      
    } catch (err) {
      console.error('업로드 오류:', err)
      onError('녹음 파일 업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
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