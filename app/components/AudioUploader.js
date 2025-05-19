'use client'

import { useState, useRef } from 'react'
import axios from 'axios'

// 최대 파일 크기 (40MB)
const MAX_FILE_SIZE = 40 * 1024 * 1024;

export default function AudioUploader({ onAnalysisStart, onAnalysisComplete, onError }) {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileSize, setFileSize] = useState(0)
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
  }

  const handleAnalyze = async () => {
    if (!file) {
      onError('분석할 파일을 먼저 업로드해주세요')
      return
    }

    onAnalysisStart()

    const formData = new FormData()
    formData.append('audio', file)

    try {
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

      if (data) {
        onAnalysisComplete(data)
      } else {
        onError('응답 데이터가 없습니다.')
      }
    } catch (error) {
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
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current.click()}
      >
        <input 
          ref={inputRef}
          type="file" 
          accept="audio/*"
          onChange={handleChange}
          className="hidden"
        />
        
        {file ? (
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
        disabled={!file}
        className={`w-full py-3 rounded-lg font-medium transition-colors
          ${file 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'}
        `}
      >
        대화 분석하기
      </button>
    </div>
  )
} 