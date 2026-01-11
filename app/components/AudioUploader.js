'use client'

import { useState, useRef } from 'react'
import { fileAPI } from '../../lib/supabase'

// 최대 파일 크기 (50MB) - 클라이언트 업로드로 제한 완화
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function AudioUploader({ onAnalysisStart, onAnalysisComplete, onError }) {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileSize, setFileSize] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFilePath, setUploadedFilePath] = useState(null)
  const inputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  // 파일 크기를 읽기 쉬운 형식으로 변환
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const handleFile = (file) => {
    // 오디오 파일 유형 확인
    if (!file.type.match('audio.*')) {
      onError('오디오 파일만 업로드 가능합니다 (.mp3, .wav, .m4a 등)')
      return
    }

    // 파일 크기 확인
    if (file.size > MAX_FILE_SIZE) {
      onError(`파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다. 현재 파일 크기: ${formatFileSize(file.size)}`)
      return
    }

    setFile(file)
    setFileSize(file.size)
    setUploadProgress(0)
    setUploadedFilePath(null)
  }

  const handleAnalyze = async () => {
    if (!file) {
      onError('분석할 파일을 먼저 업로드해주세요')
      return
    }

    onAnalysisStart()
    setUploading(true)

    try {
      // 1단계: Supabase Storage에 파일 업로드
      console.log('1. Supabase에 파일 업로드 시작...')
      setUploadProgress(20);

      const uploadResult = await fileAPI.uploadTempFile(file)

      if (!uploadResult.success) {
        throw new Error(`파일 업로드 실패: ${uploadResult.error}`)
      }

      setUploadedFilePath(uploadResult.data.path)
      setUploadProgress(40);

      console.log('2. 파일 업로드 완료, 분석 API 호출...')

      // 2단계: 분석 API 호출 (RID만 받기)
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl: uploadResult.data.url,
          filePath: uploadResult.data.path
        })
      });

      setUploadProgress(60);

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'processing' && data.rid) {
        console.log('3. 분석 요청 성공, RID:', data.rid);

        // 3단계: 폴링으로 결과 확인
        const result = await pollForResults(data.rid, data.filePath);

        setUploading(false);
        setUploadProgress(100);

        if (result) {
          onAnalysisComplete(result, file);
        } else {
          onError('분석 결과를 받지 못했습니다.');
        }
      } else {
        throw new Error(data.error || '분석 요청 실패');
      }

    } catch (error) {
      setUploading(false);
      console.error('분석 오류:', error);

      // 오류 발생 시 업로드된 파일 삭제
      if (uploadedFilePath) {
        try {
          await fileAPI.deleteTempFile(uploadedFilePath)
          console.log('오류 시 임시 파일 삭제 완료')
        } catch (deleteError) {
          console.error('임시 파일 삭제 실패:', deleteError)
        }
      }

      onError(error.message || '파일 분석 중 오류가 발생했습니다.');
    }
  }

  // 폴링으로 결과 확인
  const pollForResults = async (rid, filePath) => {
    const maxRetries = 30; // 최대 5분 대기
    const retryInterval = 10000; // 10초마다 확인

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`결과 확인 중... (${i + 1}/${maxRetries})`);

        // 진행률 업데이트 (60% ~ 95%)
        const progress = 60 + (i / maxRetries) * 35;
        setUploadProgress(Math.round(progress));

        const response = await fetch(`/api/analyze-status?rid=${rid}&filePath=${filePath}`);

        if (!response.ok) {
          throw new Error(`상태 확인 오류: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'completed') {
          console.log('분석 완료!');
          return data;
        } else if (data.status === 'error') {
          throw new Error(data.error);
        }

        // 아직 처리 중이면 대기
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryInterval));
        }

      } catch (error) {
        console.error('폴링 오류:', error);
        throw error;
      }
    }

    throw new Error('분석 시간이 너무 오래 걸립니다. 더 짧은 파일을 사용해보세요.');
  }

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-4
          ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${file ? 'bg-green-50 border-green-300' : ''}
          ${uploading ? 'pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.webm,.ogg"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div>
            <p className="text-blue-600 font-medium">
              {uploadProgress < 50 ? '파일 업로드 중...' : '음성 분석 중...'}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 mb-1">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-500">{uploadProgress}% 완료</p>
          </div>
        ) : file ? (
          <div>
            <p className="text-green-600 font-medium">파일 선택 완료!</p>
            <p className="text-sm text-gray-500 mt-1">{file.name}</p>
            <p className="text-sm text-gray-500">{formatFileSize(fileSize)}</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">녹음 파일을 여기에 끌어다 놓거나 클릭하여 선택하세요</p>
            <p className="text-sm text-gray-500 mt-1">지원 형식: .mp3, .wav, .m4a, .aac</p>
            <p className="text-sm text-gray-500">최대 파일 크기: 50MB</p>

          </div>
        )}
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!file || uploading}
        className={`w-full py-3 rounded-lg font-medium transition-colors
          ${file && !uploading
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'}
        `}
      >
        {uploading ? '처리 중...' : '대화 분석하기'}
      </button>
    </div>
  )
} 