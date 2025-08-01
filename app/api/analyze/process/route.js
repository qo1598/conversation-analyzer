import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, getBlob, listAll, getBytes } from 'firebase/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import crypto from 'crypto-js';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCMfOKrEe89G6jnlW2A-TwDeKe8FS_K1uY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "conversation-analyzer-67e97.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "conversation-analyzer-67e97",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "conversation-analyzer-67e97.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "919686543413",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:919686543413:web:2efd0b1ec412a53906197c",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-31J910Q1ZF"
};

// API 키 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBr3C6s-vWZR9LfI_Kc72jLQsI3bemd-Fk";
const CLOVA_API_KEY = process.env.CLOVA_API_KEY || "6c966a5202884166a61d60ffe94e3fe3";
const CLOVA_INVOKE_URL = process.env.CLOVA_INVOKE_URL || "https://clovaspeech-gw.ncloud.com/external/v1/11426/ecd178705e5c9daf118851dee0f7d32ed78312436cca9be9f61aef879f729654";

// App Router 설정
export const config = {
  runtime: 'edge',
};

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Firebase 초기화
let firebaseApp;
let firebaseStorage;
try {
  firebaseApp = initializeApp(firebaseConfig);
  firebaseStorage = getStorage(firebaseApp);
  console.log('Firebase 초기화 완료');
} catch (error) {
  console.error('Firebase 초기화 오류:', error);
}

// OPTIONS 메서드 처리 함수 (CORS preflight 요청 처리)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// 청크 처리 API 비활성화
export async function POST(req) {
  console.log('청크 처리 API는 더 이상 사용되지 않습니다. 새로운 업로드 방식을 사용하세요.');
  
  return NextResponse.json(
    { 
      error: '청크 처리 API는 더 이상 사용되지 않습니다. 새로운 직접 업로드 방식을 사용하세요.' 
    },
    { status: 410, headers: corsHeaders }
  );
}

// CLOVA Speech API를 사용한 화자 분리 및 텍스트 변환 함수
async function processSpeechWithClova(audioUrl) {
  try {
    console.log('CLOVA Speech API 트랜스크립션 시작...');
    
    // API 키 확인
    if (!CLOVA_API_KEY) {
      throw new Error('CLOVA API 키가 설정되지 않았습니다.');
    }
    
    console.log('CLOVA API 키 확인 완료, API 호출 시작...');
    console.log('원본 URL:', audioUrl);
    
    // 오디오 URL이 공개적으로 접근 가능하도록 보장
    if (!audioUrl.includes('alt=media')) {
      if (audioUrl.includes('?')) {
        audioUrl = `${audioUrl}&alt=media`;
      } else {
        audioUrl = `${audioUrl}?alt=media`;
      }
    }
    
    // URL 엔코딩 확인
    if (audioUrl.includes(' ')) {
      audioUrl = audioUrl.replace(/ /g, '%20');
    }
    
    console.log('처리용 URL:', audioUrl);
    
    // URL 유효성 확인
    try {
      const headResponse = await axios.head(audioUrl, { timeout: 5000 });
      console.log('URL 유효성 확인:', headResponse.status, headResponse.headers['content-type']);
    } catch (headError) {
      console.warn('URL 유효성 확인 실패:', headError.message);
      // 실패해도 계속 진행
    }
    
    try {
      // URL로 직접 처리하는 방식 시도
      const urlResult = await processClovaBySendingUrl(audioUrl);
      if (urlResult.success) {
        return urlResult.data;
      }
      
      console.log('URL 방식 실패, 파일 다운로드 후 처리 시도...');
      
      // 파일 다운로드 방식 시도
      const uploadResult = await processClovaByDownloadAndUpload(audioUrl);
      if (uploadResult.success) {
        return uploadResult.data;
      }
      
      // 두 방식 모두 실패한 경우
      throw new Error('음성 파일 처리에 실패했습니다.');
      
    } catch (error) {
      console.error('CLOVA 처리 중 오류:', error);
      throw error;
    }
  } catch (error) {
    console.error('CLOVA Speech API 오류:', error);
    console.error('오류 상세 내용:', error.response?.data || '상세 정보 없음');
    
    // 오류 발생 시 기본 결과 생성하여 반환
    return {
      transcript: [{ speaker: '0', text: `음성 인식 중 오류가 발생했습니다: ${error.message}`, start: 0, end: 1 }],
      speakers: { '0': { id: '0', name: '화자 1', color: '#3B82F6' } }
    };
  }
}

// URL을 CLOVA API로 직접 전송하는 방식
async function processClovaBySendingUrl(audioUrl) {
  try {
    // CLOVA Speech API 요청 옵션
    const requestOptions = {
      language: 'ko-KR',            // 한국어
      completion: 'sync',           // 동기 처리
      url: audioUrl,                // 오디오 파일 URL
      diarization: {
        enable: true                // 화자 분리 활성화
      },
      wordAlignment: true,          // 인식 결과의 음성과 텍스트 정렬 출력
      fullText: true,               // 전체 인식 결과 텍스트 출력
      requestId: crypto.lib.WordArray.random(16).toString()  // 고유 요청 ID 생성
    };
    
    // API 요청 URL
    const apiUrl = `${CLOVA_INVOKE_URL}/recognizer/url`;
    
    // API 호출 (타임아웃 15초 설정)
    const response = await axios.post(apiUrl, requestOptions, {
      headers: {
        'Content-Type': 'application/json',
        'X-CLOVASPEECH-API-KEY': CLOVA_API_KEY
      },
      timeout: 15000
    });
    
    console.log('CLOVA API 응답 상태:', response.status);
    
    // 응답 확인
    if (response.status !== 200 || !response.data) {
      throw new Error(`CLOVA API 요청 오류: ${response.status}`);
    }
    
    console.log('CLOVA API 응답 구조:', JSON.stringify(response.data).slice(0, 300) + '...');
    
    // API 응답이 실패 상태인 경우
    if (response.data.result === 'FAILED') {
      console.error('CLOVA API 처리 실패:', response.data.message);
      return { success: false, error: response.data.message };
    }
    
    // 결과 생성 및 반환
    return { 
      success: true, 
      data: processTranscriptionResult(response.data) 
    };
  } catch (error) {
    console.error('URL 방식 CLOVA API 오류:', error);
    return { success: false, error: error.message };
  }
}

// 파일을 다운로드하여 직접 업로드하는 방식
async function processClovaByDownloadAndUpload(audioUrl) {
  try {
    console.log('파일 다운로드 시도 중...');
    
    // 파일 다운로드 - 타임아웃 및 재시도 처리
    let response;
    try {
      response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 100 * 1024 * 1024, // 100MB
        headers: {
          'Accept': 'audio/*',
          'Cache-Control': 'no-cache'
        }
      });
    } catch (downloadError) {
      console.error('첫 번째 다운로드 시도 실패:', downloadError.message);
      
      // 재시도 - URL 파라미터 변경
      try {
        const retryUrl = audioUrl.includes('?') ? 
          `${audioUrl}&t=${Date.now()}` : 
          `${audioUrl}?t=${Date.now()}`;
        
        console.log('다운로드 재시도:', retryUrl);
        
        response = await axios.get(retryUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: 100 * 1024 * 1024
        });
      } catch (retryError) {
        console.error('재시도 다운로드 실패:', retryError.message);
        throw retryError;
      }
    }
    
    // 다운로드 성공 확인
    if (!response.data || response.data.byteLength === 0) {
      throw new Error('다운로드된 파일이 비어 있습니다');
    }
    
    console.log('파일 다운로드 완료, 크기:', response.data.byteLength, 
                '타입:', response.headers['content-type'] || 'audio/mpeg');
    
    // 파일 타입 확인
    const contentType = response.headers['content-type'] || 'audio/mpeg';
    
    // CLOVA Speech API 요청 옵션
    const formData = new FormData();
    
    // 적절한 파일 확장자 결정
    let fileExt = '.mp3';
    if (contentType.includes('wav')) fileExt = '.wav';
    else if (contentType.includes('m4a')) fileExt = '.m4a';
    else if (contentType.includes('ogg')) fileExt = '.ogg';
    
    // Blob 생성
    const audioBlob = new Blob([response.data], { type: contentType });
    formData.append('media', audioBlob, `audio${fileExt}`);
    
    console.log(`CLOVA로 업로드 준비: ${audioBlob.size} 바이트, 타입: ${contentType}, 확장자: ${fileExt}`);
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-CLOVASPEECH-API-KEY': CLOVA_API_KEY
      },
      params: {
        language: 'ko-KR',
        completion: 'sync',
        diarization: { enable: true },
        wordAlignment: true,
        fullText: true
      },
      timeout: 60000 // 타임아웃 증가
    };
    
    // API 요청 URL (파일 업로드용)
    const apiUrl = `${CLOVA_INVOKE_URL}/recognizer/upload`;
    
    // API 호출
    const clovaResponse = await axios.post(apiUrl, formData, config);
    
    console.log('CLOVA API(업로드) 응답 상태:', clovaResponse.status);
    
    // 응답 확인
    if (clovaResponse.status !== 200 || !clovaResponse.data) {
      throw new Error(`CLOVA API(업로드) 요청 오류: ${clovaResponse.status}`);
    }
    
    console.log('CLOVA API(업로드) 응답 구조:', JSON.stringify(clovaResponse.data).slice(0, 300) + '...');
    
    // API 응답이 실패 상태인 경우
    if (clovaResponse.data.result === 'FAILED') {
      console.error('CLOVA API(업로드) 처리 실패:', clovaResponse.data.message);
      return { success: false, error: clovaResponse.data.message };
    }
    
    // 결과 생성 및 반환
    return { 
      success: true, 
      data: processTranscriptionResult(clovaResponse.data) 
    };
  } catch (error) {
    console.error('업로드 방식 CLOVA API 오류:', error);
    return { success: false, error: error.message };
  }
}

// 트랜스크립션 결과 처리 함수
function processTranscriptionResult(apiResponse) {
  // 화자 색상 지정
  const speakerColors = {
    '0': '#3B82F6', // blue
    '1': '#EF4444', // red
    '2': '#10B981', // green
    '3': '#F59E0B', // yellow
    '4': '#8B5CF6', // purple
    '5': '#EC4899', // pink
  };
  
  // 화자 정보 구성
  const speakersMap = {};
  
  // 결과 변환 - CLOVA Speech API 응답 구조에 맞게 처리
  const segments = [];
  
  if (apiResponse.segments && apiResponse.segments.length > 0) {
    // 세그먼트 처리
    apiResponse.segments.forEach((segment, index) => {
      const speakerId = segment.speaker && segment.speaker.label ? segment.speaker.label : '0';
      const text = segment.text || '';
      const startTime = segment.start / 1000 || 0; // ms to seconds
      const endTime = segment.end / 1000 || 0;     // ms to seconds
      
      // 세그먼트 추가
      segments.push({
        speaker: speakerId,
        text: text,
        start: startTime,
        end: endTime
      });
      
      // 화자 정보 저장
      if (!speakersMap[speakerId]) {
        speakersMap[speakerId] = {
          id: speakerId,
          name: segment.speaker && segment.speaker.name ? segment.speaker.name : `화자 ${parseInt(speakerId) + 1}`,
          color: speakerColors[speakerId] || '#374151'
        };
      }
    });
  } else {
    // 세그먼트 정보가 없는 경우
    if (apiResponse.text) {
      segments.push({
        speaker: '0',
        text: apiResponse.text || '',
        start: 0,
        end: 10
      });
      
      // 기본 화자 정보
      speakersMap['0'] = {
        id: '0',
        name: '화자 1',
        color: speakerColors['0']
      };
    } else {
      // 결과가 없는 경우
      segments.push({
        speaker: '0',
        text: '음성 인식 결과가 없습니다. 다른 오디오 파일을 시도해 보세요.',
        start: 0,
        end: 1
      });
      
      speakersMap['0'] = {
        id: '0',
        name: '화자 1',
        color: speakerColors['0']
      };
    }
  }
  
  console.log(`CLOVA Speech 트랜스크립션 변환 완료. 세그먼트 수: ${segments.length}`);
  
  return {
    transcript: segments,
    speakers: speakersMap
  };
}

// Gemini API를 사용한 대화 분석
async function analyzeConversation(transcript) {
  try {
    // API 키 확인
    const apiKey = GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('Gemini API 키가 설정되지 않았습니다. 분석을 건너뜁니다.');
      return {
        criteria: [
          {
            name: "의사소통 명확성",
            score: 0.5,
            feedback: "API 키가 설정되지 않아 분석할 수 없습니다."
          },
          {
            name: "적극적 경청",
            score: 0.5,
            feedback: "API 키가 설정되지 않아 분석할 수 없습니다."
          },
          {
            name: "회의 효율성",
            score: 0.5,
            feedback: "API 키가 설정되지 않아 분석할 수 없습니다."
          },
          {
            name: "문제 해결 능력",
            score: 0.5,
            feedback: "API 키가 설정되지 않아 분석할 수 없습니다."
          }
        ],
        summary: "Gemini API 키가 설정되지 않아 대화 분석을 수행할 수 없습니다. API 키를 설정하고 다시 시도해 주세요."
      };
    }
    
    console.log('Gemini API 키 확인 완료, API 호출 시작...');
    
    try {
      // Gemini API 초기화
      const genAI = new GoogleGenerativeAI(apiKey);
      // 올바른 모델명 사용
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // 분석용 프롬프트 생성
      const conversationText = transcript
        .map(item => `화자 ${item.speaker}: ${item.text}`)
        .join('\n');

      const prompt = `
다음은 회의 대화 내용입니다. 이 대화를 다음 기준에 따라 분석하고 평가해주세요:

1. 의사소통 명확성: 화자들이 얼마나 명확하게 의사를 전달했는지
2. 적극적 경청: 화자들이 서로의 의견을 경청하고 반응했는지
3. 회의 효율성: 대화가 효율적으로 진행되었는지
4. 문제 해결 능력: 문제 제기와 해결책 제시가 적절했는지

각 기준별로 0.0에서 1.0 사이의 점수와 짧은 피드백을 제공해주세요.
마지막으로 전체적인 대화 평가를 요약해주세요.

응답은 다음과 같은 JSON 형식으로 제공해주세요:
{
  "criteria": [
    {
      "name": "기준명",
      "score": 점수(0.0~1.0),
      "feedback": "피드백 내용"
    },
    ...
  ],
  "summary": "전체 평가 요약"
}

대화 내용:
${conversationText}
`;

      console.log('Gemini API 호출 중...');
      
      // 타임아웃 설정으로 API 호출 보호
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API 호출 시간 초과')), 10000)
      );
      
      const apiPromise = model.generateContent(prompt);
      
      // Promise.race로 타임아웃 구현
      const result = await Promise.race([apiPromise, timeoutPromise]);
      const responseText = result.response.text();
      
      // JSON 추출
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Gemini API 응답에서 JSON을 추출할 수 없습니다.');
    } catch (geminiError) {
      console.error('Gemini API 호출 중 오류:', geminiError);
      
      // 폴백 응답 생성
      return {
        criteria: [
          {
            name: "의사소통 명확성",
            score: 0.5,
            feedback: "Gemini API 서비스 오류로 정확한 분석이 불가합니다."
          },
          {
            name: "적극적 경청",
            score: 0.5,
            feedback: "Gemini API 서비스 오류로 정확한 분석이 불가합니다."
          },
          {
            name: "회의 효율성",
            score: 0.5,
            feedback: "Gemini API 서비스 오류로 정확한 분석이 불가합니다."
          },
          {
            name: "문제 해결 능력",
            score: 0.5,
            feedback: "Gemini API 서비스 오류로 정확한 분석이 불가합니다."
          }
        ],
        summary: "현재 Gemini API 서비스 오류로 인해 대화 분석을 수행할 수 없습니다. 나중에 다시 시도해 주세요."
      };
    }
  } catch (error) {
    console.error('분석 함수 내부 오류:', error);
    // 기본 응답 생성
    return {
      criteria: [
        {
          name: "오류",
          score: 0,
          feedback: "분석 중 오류가 발생했습니다."
        }
      ],
      summary: `분석 중 오류 발생: ${error.message}`
    };
  }
} 