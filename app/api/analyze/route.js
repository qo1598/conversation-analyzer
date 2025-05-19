import { NextResponse } from 'next/server'
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'
import crypto from 'crypto-js'

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

// API 키 환경 변수에서 가져오기
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBr3C6s-vWZR9LfI_Kc72jLQsI3bemd-Fk";
// NAVER CLOVA Speech API 키
const CLOVA_API_KEY = process.env.CLOVA_API_KEY || "6c966a5202884166a61d60ffe94e3fe3";
// CLOVA Speech 서비스 설정 - 실제 제공된 Invoke URL
const CLOVA_INVOKE_URL = process.env.CLOVA_INVOKE_URL || "https://clovaspeech-gw.ncloud.com/external/v1/11426/ecd178705e5c9daf118851dee0f7d32ed78312436cca9be9f61aef879f729654";

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

// POST 요청 처리
export async function POST(req) {
  try {
    // 요청 크기 확인
    const contentLength = req.headers.get('content-length');
    console.log('요청 크기:', contentLength ? `${Math.round(contentLength / 1024 / 1024 * 100) / 100}MB` : '알 수 없음');
    
    // 파일 크기 제한 (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return NextResponse.json(
        { error: `파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다. (현재: ${Math.round(contentLength / 1024 / 1024 * 100) / 100}MB)` },
        { status: 413, headers: corsHeaders }
      );
    }
    
    // 파일 업로드 처리 - req.formData() 사용
    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error('FormData 파싱 오류:', formError);
      return NextResponse.json(
        { error: `요청 데이터 처리 중 오류가 발생했습니다: ${formError.message}` },
        { status: 400 }
      );
    }
    
    const audioFile = formData.get('audio');
    
    if (!audioFile) {
      return NextResponse.json(
        { error: '업로드된 오디오 파일이 없습니다' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Firebase Storage에 업로드
    let firebaseFileRef = null;
    
    try {
      // 파일을 arrayBuffer로 변환
      const fileBuffer = await audioFile.arrayBuffer();
      
      // 파일 업로드 확인
      console.log(`파일 크기: ${fileBuffer.byteLength} bytes`);
      
      if (!firebaseStorage) {
        return NextResponse.json(
          { error: 'Firebase Storage 초기화 실패' },
          { status: 500, headers: corsHeaders }
        );
      }
      
      try {
        // Firebase Storage에 파일 업로드
        const fileExt = audioFile.name ? `.${audioFile.name.split('.').pop()}` : '.tmp';
        const fileName = `audio_${Date.now()}${fileExt}`;
        const storageRef = ref(firebaseStorage, `uploads/${fileName}`);
        
        console.log('Firebase Storage에 파일 업로드 중...');
        
        // 파일 업로드
        await uploadBytes(storageRef, fileBuffer);
        
        // 다운로드 URL 가져오기
        const audioUrl = await getDownloadURL(storageRef);
        
        console.log('Firebase Storage 업로드 완료. URL:', audioUrl);
        
        // 파일 참조 저장
        firebaseFileRef = storageRef;
        
        // CLOVA Speech API 호출
        const transcript = await processSpeechWithClova(audioUrl);
        
        // Gemini API를 사용한 대화 분석
        const analysisResult = await analyzeConversation(transcript.transcript);
        
        // Firebase Storage에서 파일 삭제
        if (firebaseFileRef) {
          try {
            await deleteObject(firebaseFileRef);
            console.log('Firebase Storage에서 파일 삭제 완료');
          } catch (deleteError) {
            console.error('Firebase Storage 파일 삭제 오류:', deleteError);
          }
        }

        // 분석 결과 반환
        return NextResponse.json({
          transcript: transcript.transcript,
          speakers: transcript.speakers,
          analysis: analysisResult,
        }, { headers: corsHeaders });
      } catch (apiError) {
        console.error('API 처리 오류:', apiError);
        
        // Firebase Storage에서 파일 삭제
        if (firebaseFileRef) {
          try {
            await deleteObject(firebaseFileRef);
            console.log('Firebase Storage에서 파일 삭제 완료');
          } catch (deleteError) {
            console.error('Firebase Storage 파일 삭제 오류:', deleteError);
          }
        }
        
        return NextResponse.json(
          { error: `API 처리 오류: ${apiError.message}` },
          { status: 500, headers: corsHeaders }
        );
      }
    } catch (error) {
      console.error('파일 처리 오류:', error);
      return NextResponse.json(
        { error: `오디오 처리 중 오류가 발생했습니다: ${error.message}` },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json(
      { error: `오디오 처리 중 오류가 발생했습니다: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
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
    console.log('사용 URL:', audioUrl);
    
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
    
    // API 호출
    const response = await axios.post(apiUrl, requestOptions, {
      headers: {
        'Content-Type': 'application/json',
        'X-CLOVASPEECH-API-KEY': CLOVA_API_KEY
      }
    });
    
    console.log('CLOVA API 응답 상태:', response.status);
    
    // 응답 확인
    if (response.status !== 200 || !response.data) {
      throw new Error(`CLOVA API 요청 오류: ${response.status}`);
    }
    
    console.log('CLOVA API 응답 구조:', JSON.stringify(response.data).slice(0, 300) + '...');
    
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
    
    if (response.data.segments && response.data.segments.length > 0) {
      // 세그먼트 처리
      response.data.segments.forEach((segment, index) => {
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
      if (response.data.text) {
        segments.push({
          speaker: '0',
          text: response.data.text || '',
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
          text: '음성 인식 결과가 없습니다',
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
  } catch (error) {
    console.error('CLOVA Speech API 오류:', error);
    console.error('오류 상세 내용:', error.response?.data || '상세 정보 없음');
    throw new Error(`CLOVA Speech API 처리 중 오류 발생: ${error.message}`);
  }
}

// Gemini API를 사용한 대화 분석
async function analyzeConversation(transcript) {
  try {
    // API 키 확인
    const apiKey = GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }
    
    console.log('Gemini API 키 확인 완료, API 호출 시작...');
    
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
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // JSON 추출
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Gemini API 응답에서 JSON을 추출할 수 없습니다.');
  } catch (error) {
    console.error('Gemini API 호출 중 오류:', error);
    throw error;
  }
} 