import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import crypto from 'crypto-js';


// API 키 설정
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBP4odtkyJ9IA9f9ltND1SsDiMmVLyqK30";
const CLOVA_API_KEY = process.env.CLOVA_API_KEY || "6c966a5202884166a61d60ffe94e3fe3";
const CLOVA_INVOKE_URL = process.env.CLOVA_INVOKE_URL || "https://clovaspeech-gw.ncloud.com/external/v1/11426/ecd178705e5c9daf118851dee0f7d32ed78312436cca9be9f61aef879f729654";

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

// OPTIONS 메서드 처리 함수
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// 새로운 심플 분석 API 라우트
export async function POST(req) {
  console.log('Simple API 처리 시작...');
  
  try {
    // 요청 본문에서 오디오 URL 추출
    const requestData = await req.json();
    const { audioUrl } = requestData;
    
    if (!audioUrl) {
      console.error('오디오 URL이 제공되지 않았습니다.');
      return NextResponse.json(
        { error: '유효한 오디오 URL이 필요합니다.' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('오디오 URL 수신:', audioUrl);
    
    // 1. CLOVA Speech API로 음성 인식 및 화자 분리
    const transcriptionResult = await processSpeechWithClova(audioUrl);
    
    if (!transcriptionResult || !transcriptionResult.transcript) {
      throw new Error('음성 인식 결과가 없습니다.');
    }
    
    console.log('음성 인식 완료, 세그먼트 수:', transcriptionResult.transcript.length);
    
    // 2. Gemini API로 대화 분석
    const analysisResult = await analyzeConversation(transcriptionResult.transcript);
    
    // 3. 종합 결과 반환
    const result = {
      ...transcriptionResult,
      analysis: analysisResult
    };
    
    console.log('분석 완료, 응답 전송');
    
    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('Simple API 처리 중 오류:', error);
    
    return NextResponse.json(
      { error: `처리 중 오류가 발생했습니다: ${error.message}` },
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
    
    // API 호출 (타임아웃 30초 설정)
    const response = await axios.post(apiUrl, requestOptions, {
      headers: {
        'Content-Type': 'application/json',
        'X-CLOVASPEECH-API-KEY': CLOVA_API_KEY
      },
      timeout: 30000
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
      throw new Error(`CLOVA API 처리 실패: ${response.data.message}`);
    }
    
    // 결과 처리 및 반환
    return processTranscriptionResult(response.data);
    
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
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
        setTimeout(() => reject(new Error('Gemini API 호출 시간 초과')), 30000)
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