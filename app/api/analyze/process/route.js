import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import crypto from 'crypto-js';

// 임시 디렉토리 설정
const TMP_DIR = path.join(process.cwd(), 'tmp');
const CHUNK_DIR = path.join(TMP_DIR, 'chunks');

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
  runtime: 'nodejs',
  maxDuration: 300, // 최대 5분
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

// POST 처리 함수
export async function POST(req) {
  let mergedFilePath = null;
  let firebaseFileRef = null;
  
  try {
    // 요청 본문 파싱
    const body = await req.json();
    const { sessionId, fileName } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: '세션 ID가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 세션 디렉토리 경로
    const sessionDir = path.join(CHUNK_DIR, sessionId);
    
    // 세션 디렉토리가 없으면 오류
    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json(
        { error: '유효하지 않은 세션입니다.' },
        { status: 400 }
      );
    }

    // 세션 정보 읽기
    const infoPath = path.join(sessionDir, 'info.json');
    if (!fs.existsSync(infoPath)) {
      return NextResponse.json(
        { error: '세션 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const sessionInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    
    // 모든 청크가 업로드되었는지 확인
    const allChunksUploaded = sessionInfo.chunks.every(chunk => chunk === true);
    if (!allChunksUploaded) {
      return NextResponse.json(
        { error: '모든 청크가 업로드되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 청크 파일들을 하나로 합치기
    const originalExt = path.extname(sessionInfo.fileName) || '.tmp';
    mergedFilePath = path.join(TMP_DIR, `upload_${Date.now()}${originalExt}`);
    
    // 출력 스트림 생성
    const outputStream = fs.createWriteStream(mergedFilePath);
    
    // 각 청크를 순서대로 합치기
    for (let i = 0; i < sessionInfo.totalChunks; i++) {
      const chunkPath = path.join(sessionDir, `chunk-${i}`);
      if (fs.existsSync(chunkPath)) {
        const chunkData = fs.readFileSync(chunkPath);
        outputStream.write(chunkData);
      } else {
        // 청크 파일이 없으면 오류
        outputStream.end();
        return NextResponse.json(
          { error: `청크 파일(${i})이 누락되었습니다.` },
          { status: 400 }
        );
      }
    }
    
    // 스트림 종료 및 다음 처리 대기
    await new Promise((resolve, reject) => {
      outputStream.on('finish', resolve);
      outputStream.on('error', reject);
      outputStream.end();
    });

    console.log(`파일 병합 완료: ${mergedFilePath}`);
    
    // 이제 기존 분석 프로세스와 동일하게 처리
    const { transcript, speakers, storageRef } = await processSpeechToText(mergedFilePath);
    
    // Firebase 파일 참조 저장
    firebaseFileRef = storageRef;
    
    // Gemini API를 사용한 대화 분석
    const analysisResult = await analyzeConversation(transcript);
    
    // 임시 파일 삭제
    cleanupFiles(mergedFilePath, sessionDir);
    
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
  } catch (error) {
    console.error('파일 처리 오류:', error);
    
    // 오류 발생 시 임시 파일 정리
    if (mergedFilePath && fs.existsSync(mergedFilePath)) {
      fs.unlinkSync(mergedFilePath);
    }
    
    // Firebase Storage에서 파일 삭제
    if (firebaseFileRef) {
      try {
        await deleteObject(firebaseFileRef);
      } catch (deleteError) {
        console.error('Firebase Storage 파일 삭제 오류:', deleteError);
      }
    }
    
    return NextResponse.json(
      { error: `파일 처리 중 오류가 발생했습니다: ${error.message}` },
      { status: 500 }
    );
  }
}

// 임시 파일 정리 함수
function cleanupFiles(mergedFilePath, sessionDir) {
  try {
    // 병합된 파일 삭제
    if (mergedFilePath && fs.existsSync(mergedFilePath)) {
      fs.unlinkSync(mergedFilePath);
    }
    
    // 세션 디렉토리 삭제 (재귀적으로)
    if (sessionDir && fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (cleanupError) {
    console.error('임시 파일 정리 중 오류:', cleanupError);
  }
}

// 기존 코드에서 가져온 함수들
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
    
    // 임시 파일 서버로 업로드 후 URL 얻기
    let audioUrl;
    let storageRef = null; // Firebase Storage 참조 저장용
    
    try {
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