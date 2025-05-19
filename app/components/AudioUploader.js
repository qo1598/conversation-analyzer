'use client'

import { useState, useRef } from 'react'
import axios from 'axios'

// 최대 파일 크기 (40MB)
const MAX_FILE_SIZE = 40 * 1024 * 1024;
// 청크 크기 (4MB)
const CHUNK_SIZE = 4 * 1024 * 1024;

export default function AudioUploader({ onAnalysisStart, onAnalysisComplete, onError }) {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileSize, setFileSize] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
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
      onError(`파일 크기가 너무 큽니다. 최대 40MB까지 업로드 가능합니다. 현재 파일 크기: ${formatFileSize(file.size)}`)
      return
    }

    setFile(file)
    setFileSize(file.size)
    setUploadProgress(0)
  }

  // 파일을 청크 단위로 분할하여 업로드하는 함수
  const uploadFileInChunks = async (file) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const fileType = file.type;
    const fileName = file.name;
    
    try {
      // 세션 ID 생성 (타임스탬프와 랜덤 문자열 조합)
      const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      // 파일 업로드 초기화
      const initResponse = await fetch('/api/analyze/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          fileType,
          fileSize: file.size,
          totalChunks,
          sessionId
        }),
      });
      
      if (!initResponse.ok) {
        throw new Error(`업로드 초기화 오류: ${initResponse.status}`);
      }
      
      const { success: initSuccess } = await initResponse.json();
      
      if (!initSuccess) {
        throw new Error('업로드 초기화 실패');
      }
      
      // 청크 단위로 업로드
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('sessionId', sessionId);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('totalChunks', totalChunks.toString());
        
        const chunkResponse = await fetch('/api/analyze/upload-chunk', {
          method: 'POST',
          body: formData,
        });
        
        if (!chunkResponse.ok) {
          throw new Error(`청크 업로드 오류: ${chunkResponse.status}`);
        }
        
        // 진행 상태 업데이트
        setUploadProgress(Math.round((chunkIndex + 1) / totalChunks * 100));
      }
      
      // 모든 청크 업로드 완료 후 분석 시작
      return fetch('/api/analyze/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          fileName,
          fileType,
        }),
      });
      
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      throw error;
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      onError('분석할 파일을 먼저 업로드해주세요')
      return
    }

    onAnalysisStart()
    setUploading(true)

    try {
      // 파일 크기가 4MB 미만이면 직접 업로드
      if (file.size < CHUNK_SIZE) {
        const formData = new FormData()
        formData.append('audio', file)

        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('서버 오류 응답:', response.status, errorText);
          throw new Error(`서버 응답 오류: ${response.status}`)
        }
        
        const data = await response.json()
        setUploading(false)

        if (data) {
          onAnalysisComplete(data)
        } else {
          onError('응답 데이터가 없습니다.')
        }
      } else {
        // 파일 크기가 크면 청크 단위로 분할하여 업로드
        const response = await uploadFileInChunks(file);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('서버 오류 응답:', response.status, errorText);
          throw new Error(`서버 응답 오류: ${response.status}`)
        }
        
        const data = await response.json()
        setUploading(false)

        if (data) {
          onAnalysisComplete(data)
        } else {
          onError('응답 데이터가 없습니다.')
        }
      }
    } catch (error) {
      setUploading(false)
      console.error('분석 오류:', error)
      onError(error.message || '파일 분석 중 오류가 발생했습니다.')
    }
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
          accept="audio/*"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
        
        {uploading ? (
          <div>
            <p className="text-blue-600 font-medium">파일 업로드 중...</p>
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
            <p className="text-green-600 font-medium">파일 업로드 완료!</p>
            <p className="text-sm text-gray-500 mt-1">{file.name}</p>
            <p className="text-sm text-gray-500">{formatFileSize(fileSize)}</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">녹음 파일을 여기에 끌어다 놓거나 클릭하여 선택하세요</p>
            <p className="text-sm text-gray-500 mt-1">지원 형식: .mp3, .wav, .m4a</p>
            <p className="text-sm text-gray-500">최대 파일 크기: 40MB</p>
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