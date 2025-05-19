import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { initializeApp } from 'firebase/app'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import FormData from 'form-data'
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

// App Router에서는 bodyParser 설정이 다름
// 이 부분은 middleware.ts에서 설정해야 할 수 있음
export const config = {
  runtime: 'nodejs',
  maxDuration: 60, // 요청 처리 최대 시간 (초)
}

// 파일을 임시로 저장할 디렉토리
const UPLOAD_DIR = path.join(process.cwd(), 'tmp')

// API 키 환경 변수에서 가져오기
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBr3C6s-vWZR9LfI_Kc72jLQsI3bemd-Fk";
// NAVER CLOVA Speech API 키
const CLOVA_API_KEY = process.env.CLOVA_API_KEY || "6c966a5202884166a61d60ffe94e3fe3";
// CLOVA Speech 서비스 설정 - 실제 제공된 Invoke URL
const CLOVA_INVOKE_URL = process.env.CLOVA_INVOKE_URL || "https://clovaspeech-gw.ncloud.com/external/v1/11426/ecd178705e5c9daf118851dee0f7d32ed78312436cca9be9f61aef879f729654";

// 디렉토리가 없으면 생성
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// POST 요청 처리
export async function POST(req) {
  try {
    // 환경변수 확인
    console.log('환경변수 확인:');
    console.log('- GEMINI_API_KEY 여부:', !!GEMINI_API_KEY);
    console.log('- CLOVA_API_KEY 여부:', !!CLOVA_API_KEY);
    
    // 요청 크기 확인
    const contentLength = req.headers.get('content-length');
    console.log('요청 크기:', contentLength ? `${Math.round(contentLength / 1024 / 1024 * 100) / 100}MB` : '알 수 없음');
    
    // 파일 크기 제한 (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return NextResponse.json(
        { error: `파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다. (현재: ${Math.round(contentLength / 1024 / 1024 * 100) / 100}MB)` },
        { status: 413 }
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
        { status: 400 }
      )
    }

    // 임시 파일로 저장
    const filePath = path.join(UPLOAD_DIR, `upload_${Date.now()}${path.extname(audioFile.name) || '.tmp'}`);
    
    try {
      const fileBuffer = Buffer.from(await audioFile.arrayBuffer());
      fs.writeFileSync(filePath, fileBuffer);
      console.log(`파일 저장 완료: ${filePath} (${fileBuffer.length} bytes)`);
    } catch (fileError) {
      console.error('파일 저장 오류:', fileError);
      return NextResponse.json(
        { error: `파일 저장 중 오류가 발생했습니다: ${fileError.message}` },
        { status: 500 }
      );
    }
    
    let firebaseFileRef = null; // Firebase Storage 파일 참조 저장용
    
    try {
      // NAVER CLOVA Speech API를 사용한 화자 분리 및 텍스트 변환
      const { transcript, speakers, storageRef } = await processSpeechToText(filePath);
      
      // Firebase 파일 참조 저장
      firebaseFileRef = storageRef;
      
      // Gemini API를 사용한 대화 분석
      const analysisResult = await analyzeConversation(transcript);
      
      // 임시 파일 삭제
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
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
        transcript,
        speakers,
        analysis: analysisResult,
      });
    } catch (apiError) {
      console.error('API 처리 오류:', apiError);
      
      // API 오류 발생 시 시뮬레이션 데이터 반환
      console.log('시뮬레이션 데이터로 대체합니다.');
      const simulatedData = await simulateProcessing();
      
      // 임시 파일 삭제
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      // Firebase Storage에서 파일 삭제
      if (firebaseFileRef) {
        try {
          await deleteObject(firebaseFileRef);
          console.log('Firebase Storage에서 파일 삭제 완료');
        } catch (deleteError) {
          console.error('Firebase Storage 파일 삭제 오류:', deleteError);
        }
      }
      
      return NextResponse.json({
        note: '실제 API 오류로 인해 시뮬레이션 데이터가 반환되었습니다.',
        ...simulatedData
      });
    }
  } catch (error) {
    console.error('Error processing audio:', error);
    return NextResponse.json(
      { error: `오디오 처리 중 오류가 발생했습니다: ${error.message}` },
      { status: 500 }
    );
  }
}

// NAVER CLOVA Speech API를 사용한 화자 분리 및 텍스트 변환 함수
async function processSpeechToText(audioFilePath) {
  try {
    console.log('CLOVA Speech API 트랜스크립션 시작...');
    
    // API 키 확인
    if (!CLOVA_API_KEY) {
      throw new Error('CLOVA API 키가 설정되지 않았습니다.');
    }
    
    console.log('CLOVA API 키 확인 완료, API 호출 시작...');
    
    // 오디오 파일 형식 확인
    const fileExt = path.extname(audioFilePath).toLowerCase();
    
    // 임시 파일 서버로 업로드 후 URL 얻기 (실제 서비스에서는 이 방식 구현 필요)
    let audioUrl;
    let storageRef = null; // Firebase Storage 참조 저장용
    
    try {
      // 테스트 단계에서는 샘플 URL 사용 여부 결정
      const useSampleUrl = false; // 테스트 시에는 true, 실제 구현 시에는 false
      
      if (useSampleUrl) {
        // 샘플 URL 사용 (테스트용)
        audioUrl = "https://storage.googleapis.com/bkt-actionpower-examples/audio/actionpower_hello.wav";
        console.log('테스트 모드: 샘플 URL 사용');
      } else {
        // Firebase Storage에 파일 업로드
        if (firebaseStorage) {
          try {
            // 파일 읽기
            const fileContent = fs.readFileSync(audioFilePath);
            const fileBuffer = Buffer.from(fileContent);
            
            // 파일 형식 확인
            console.log('파일 형식:', fileExt);
            
            // 업로드 경로 설정
            const fileName = `audio_${Date.now()}${fileExt}`;
            storageRef = ref(firebaseStorage, `uploads/${fileName}`);
            
            console.log('Firebase Storage에 파일 업로드 중...');
            
            // 파일 업로드
            const uploadResult = await uploadBytes(storageRef, fileBuffer);
            
            // 다운로드 URL 가져오기
            audioUrl = await getDownloadURL(storageRef);
            
            console.log('Firebase Storage 업로드 완료. URL:', audioUrl);
          } catch (firebaseError) {
            console.error('Firebase Storage 업로드 오류:', firebaseError);
            throw new Error('Firebase Storage 업로드 실패: ' + firebaseError.message);
          }
        } else {
          // Firebase 초기화 실패 시 오류
          throw new Error('Firebase Storage가 초기화되지 않았습니다.');
        }
      }
    } catch (error) {
      console.error('파일 처리 오류:', error);
      throw new Error('오디오 파일 처리 중 오류 발생: ' + error.message);
    }
    
    // CLOVA Speech API 호출 준비
    console.log('CLOVA Speech API 비동기 요청 보내는 중...');
    console.log('사용 URL:', audioUrl);
    
    // CLOVA Speech API 요청 옵션 - 가이드에 맞게 수정
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
      speakers: speakersMap,
      storageRef: storageRef // Firebase Storage 참조 반환
    };
  } catch (error) {
    console.error('CLOVA Speech API 오류:', error);
    console.error('오류 상세 내용:', error.response?.data || '상세 정보 없음');
    throw new Error(`CLOVA Speech API 처리 중 오류 발생: ${error.message}`);
  }
}

// 시뮬레이션 데이터 반환 함수 (API 오류 시 사용)
async function simulateProcessing() {
  // 화자 색상 할당
  const speakerColors = {
    '1': '#3B82F6', // blue
    '2': '#EF4444', // red
    '3': '#10B981', // green
    '4': '#F59E0B', // yellow
  };
  
  // 시뮬레이션 데이터 (API 오류 시 반환됨)
  const transcript = [
    { speaker: '1', text: '안녕하세요, 오늘 미팅에 참석해 주셔서 감사합니다.', start: 0, end: 5 },
    { speaker: '2', text: '네, 반갑습니다. 오늘 안건에 대해 논의해 보죠.', start: 5, end: 9 },
    { speaker: '1', text: '먼저 지난 프로젝트 결과에 대해 공유하겠습니다.', start: 10, end: 15 },
    { speaker: '3', text: '실적이 예상보다 좋네요. 특히 마케팅 부분이 인상적입니다.', start: 16, end: 22 },
    { speaker: '2', text: '그렇지만 고객 피드백 부분은 조금 개선이 필요해 보입니다.', start: 23, end: 28 },
    { speaker: '1', text: '말씀하신 부분 동의합니다. 다음 분기에는 이 부분을 중점적으로 개선하겠습니다.', start: 29, end: 36 },
  ];
  
  // 기본 분석 결과 (Gemini API 오류 시 반환됨)
  const defaultAnalysis = {
    criteria: [
      {
        name: '의사소통 명확성',
        score: 0.85,
        feedback: '대부분의 참가자가 의사를 명확하게 전달했습니다.'
      },
      {
        name: '적극적 경청',
        score: 0.78,
        feedback: '서로의 의견을 경청하고 반응했지만, 일부 의견은 깊이 있게 다루지 않았습니다.'
      },
      {
        name: '회의 효율성',
        score: 0.82,
        feedback: '대화가 대체로 효율적으로 진행되었으나, 일부 주제에서 불필요한 논의가 있었습니다.'
      },
      {
        name: '문제 해결 능력',
        score: 0.75,
        feedback: '문제 인식은 잘 이루어졌으나, 일부 해결책 제시가 구체적이지 않았습니다.'
      }
    ],
    summary: '전반적으로 원활한 커뮤니케이션이 이루어졌으며, 회의 목적을 달성했습니다. 향후 개선점으로는 더 구체적인 해결책 제시와 모든 참가자의 균등한 참여가 필요합니다.'
  };
  
  // Gemini API 분석 시도
  let analysis;
  try {
    analysis = await analyzeConversation(transcript);
  } catch (error) {
    console.error('Gemini API 분석 실패, 기본 분석 결과 사용:', error);
    analysis = defaultAnalysis;
  }
  
  return {
    transcript,
    speakers: {
      '1': { id: '1', name: '진행자', color: speakerColors['1'] },
      '2': { id: '2', name: '참가자 1', color: speakerColors['2'] },
      '3': { id: '3', name: '참가자 2', color: speakerColors['3'] },
    },
    analysis
  };
}

// Gemini API를 사용한 대화 분석
async function analyzeConversation(transcript) {
  try {
    // API 키 확인 (하드코딩된 값 사용)
    const apiKey = GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }
    
    console.log('Gemini API 키 확인 완료, API 호출 시작...');
    
    // Gemini API 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
    // 올바른 모델명 사용 (gemini-1.5-flash 모델 사용)
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
    
    // JSON 추출 (Gemini가 항상 완벽한 JSON을 반환하지 않을 수 있음)
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