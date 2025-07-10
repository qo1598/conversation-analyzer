import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgxbtjxxqjmgemtoyauh.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_SERVICE_KEY_HERE'

// Service role key를 사용한 Supabase 클라이언트
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// API 키 환경 변수에서 가져오기
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBr3C6s-vWZR9LfI_Kc72jLQsI3bemd-Fk";
const DAGLO_API_KEY = process.env.DAGLO_API_KEY || "LL9h2BxPTGGvjnj5zq4kDmo7";

// OPTIONS 메서드 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// GET 요청 처리 - RID로 결과 확인
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rid = searchParams.get('rid');
    const filePath = searchParams.get('filePath');
    
    if (!rid) {
      return NextResponse.json(
        { error: 'RID가 제공되지 않았습니다' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('=== 분석 상태 확인 ===');
    console.log('RID:', rid);
    console.log('FilePath:', filePath);
    
    // Daglo API 결과 확인
    const apiUrl = 'https://apis.daglo.ai/stt/v1/async/transcripts';
    const resultResponse = await axios.get(`${apiUrl}/${rid}`, {
      headers: {
        'Authorization': `Bearer ${DAGLO_API_KEY}`
      }
    });
    
    console.log('Daglo API 상태:', resultResponse.data.status);
    
    if (resultResponse.data.status === 'transcribed') {
      console.log('트랜스크립션 완료, 분석 시작...');
      
      // Daglo 결과 변환
      const transcript = convertDagloResults(resultResponse.data);
      
      // Gemini API를 사용한 대화 분석
      const analysisResult = await analyzeConversation(transcript.transcript, transcript.speakers);
      
      // 임시 파일 삭제
      if (filePath) {
        try {
          await supabase.storage
            .from('recordings')
            .remove([filePath]);
          console.log('임시 파일 삭제 완료');
        } catch (deleteError) {
          console.error('임시 파일 삭제 오류:', deleteError);
        }
      }
      
      return NextResponse.json({
        status: 'completed',
        transcript: transcript.transcript,
        speakers: transcript.speakers,
        analysis: analysisResult,
      }, { headers: corsHeaders });
      
    } else if (resultResponse.data.status === 'transcript_error' || resultResponse.data.status === 'file_error') {
      // 오류 시 임시 파일 삭제
      if (filePath) {
        try {
          await supabase.storage
            .from('recordings')
            .remove([filePath]);
          console.log('오류 시 임시 파일 삭제 완료');
        } catch (deleteError) {
          console.error('오류 시 임시 파일 삭제 실패:', deleteError);
        }
      }
      
      return NextResponse.json({
        status: 'error',
        error: `Daglo API 오류: ${resultResponse.data.status}`
      }, { status: 500, headers: corsHeaders });
      
    } else {
      // 아직 처리 중
      return NextResponse.json({
        status: 'processing',
        message: `처리 중... (${resultResponse.data.status})`
      }, { headers: corsHeaders });
    }
    
  } catch (error) {
    console.error('분석 상태 확인 오류:', error);
    return NextResponse.json(
      { error: `분석 상태 확인 중 오류가 발생했습니다: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

// TODO: 여기에 convertDagloResults와 analyzeConversation 함수들을 복사해야 함

// 간단한 Daglo 결과 변환 함수
function convertDagloResults(dagloResult) {
  try {
    console.log('=== Daglo 결과 변환 시작 ===');
    
    const segments = [];
    const speakersMap = {};
    
    // 화자 색상 지정
    const speakerColors = {
      '1': '#3B82F6', // blue
      '2': '#EF4444', // red
      '3': '#10B981', // green
      '4': '#F59E0B', // yellow
      '5': '#8B5CF6', // purple
      '6': '#EC4899', // pink
    };
    
    if (dagloResult.sttResults && dagloResult.sttResults.length > 0) {
      const sttResult = dagloResult.sttResults[0];
      
      if (sttResult.words && sttResult.words.length > 0) {
        // 1단계: 모든 고유 화자 ID 수집 (speaker 필드 우선 사용)
        const allSpeakers = new Set();
        sttResult.words.forEach(word => {
          const speakerId = word.speaker || '1'; // speaker 필드를 우선 사용
          allSpeakers.add(speakerId);
        });
        
        console.log(`감지된 화자 수: ${allSpeakers.size}`);
        console.log('화자 ID 목록:', Array.from(allSpeakers));
        
        // 2단계: 화자별 세그먼트 생성 (speaker 필드 기준)
        let currentSpeaker = null;
        let currentText = '';
        let segmentStart = null;
        let segmentEnd = null;
        let wordCount = 0;
        
        for (const word of sttResult.words) {
          const speakerId = word.speaker || '1'; // speaker 필드 사용
          const startTime = parseFloat(word.startTime?.seconds || 0) + (word.startTime?.nanos || 0) / 1000000000;
          const endTime = parseFloat(word.endTime?.seconds || 0) + (word.endTime?.nanos || 0) / 1000000000;
          
          if (currentSpeaker !== speakerId) {
            // 이전 세그먼트 저장 (충분한 길이가 있는 경우만)
            if (currentSpeaker !== null && currentText.trim() && wordCount >= 2) {
              segments.push({
                speaker: currentSpeaker,
                text: currentText.trim(),
                start: segmentStart,
                end: segmentEnd
              });
            }
            
            // 새 세그먼트 시작
            currentSpeaker = speakerId;
            currentText = word.word || '';
            segmentStart = startTime;
            segmentEnd = endTime;
            wordCount = 1;
          } else {
            // 같은 화자인 경우 텍스트 연결
            if (word.word) {
              currentText += word.word;
              wordCount++;
            }
            segmentEnd = endTime;
          }
        }
        
        // 마지막 세그먼트 저장
        if (currentSpeaker !== null && currentText.trim() && wordCount >= 2) {
          segments.push({
            speaker: currentSpeaker,
            text: currentText.trim(),
            start: segmentStart,
            end: segmentEnd
          });
        }
        
        // 3단계: 화자 정보 생성 (실제 사용된 화자만)
        const usedSpeakers = new Set(segments.map(s => s.speaker));
        usedSpeakers.forEach(speakerId => {
          const speakerNumber = parseInt(speakerId) || 1;
          speakersMap[speakerId] = {
            id: speakerId,
            name: `화자 ${speakerNumber}`,
            color: speakerColors[speakerId] || speakerColors[String(speakerNumber)] || '#374151'
          };
        });
        
        console.log(`최종 결과: ${segments.length}개 세그먼트, ${usedSpeakers.size}명 화자`);
        
      } else {
        // 단어 정보가 없는 경우 전체 텍스트만 사용
        segments.push({
          speaker: '1',
          text: sttResult.transcript || '음성 인식 결과가 없습니다',
          start: 0,
          end: 10
        });
        
        speakersMap['1'] = {
          id: '1',
          name: '화자 1',
          color: speakerColors['1']
        };
      }
    } else {
      // 결과가 없는 경우
      segments.push({
        speaker: '1',
        text: '음성 인식 결과가 없습니다',
        start: 0,
        end: 1
      });
      
      speakersMap['1'] = {
        id: '1',
        name: '화자 1',
        color: speakerColors['1']
      };
    }
    
    console.log(`변환 완료: 세그먼트 수 ${segments.length}, 화자 수 ${Object.keys(speakersMap).length}`);
    
    return {
      transcript: segments,
      speakers: speakersMap
    };
    
  } catch (error) {
    console.error('Daglo 결과 변환 오류:', error);
    
    // 변환 실패 시 기본 응답 반환
    return {
      transcript: [
        {
          speaker: '1',
          text: '결과 변환 중 오류가 발생했습니다',
          start: 0,
          end: 1
        }
      ],
      speakers: {
        '1': {
          id: '1',
          name: '화자 1',
          color: '#3B82F6'
        }
      }
    };
  }
}

// 완전한 Gemini API 대화 분석 함수
async function analyzeConversation(transcript, speakers) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }
    
    console.log('Gemini API 종합 분석 시작...');
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 전체 대화 텍스트 생성 (처음 30개 세그먼트만 사용)
    const limitedTranscript = transcript.slice(0, 30);
    const conversationText = limitedTranscript
      .map(item => `${speakers[item.speaker]?.name || `화자 ${item.speaker}`}: ${item.text}`)
      .join('\n');

    // 화자별 대화 분리
    const speakerTexts = {};
    Object.keys(speakers).forEach(speakerId => {
      speakerTexts[speakerId] = limitedTranscript
        .filter(item => item.speaker === speakerId)
        .map(item => item.text)
        .join(' ');
    });

    console.log('화자별 텍스트 분리 완료:', Object.keys(speakerTexts));

    // 1. 전체 대화 분석
    const overallAnalysis = await analyzeOverallConversation(model, conversationText);
    
    // 2. 화자별 개별 분석
    const speakerAnalyses = {};
    for (const [speakerId, speakerText] of Object.entries(speakerTexts)) {
      if (speakerText.trim()) {
        speakerAnalyses[speakerId] = await analyzeSpeakerIndividually(
          model, 
          speakerText, 
          speakers[speakerId]?.name || `화자 ${speakerId}`
        );
      }
    }

    // 3. 화자간 상호작용 분석
    const interactionAnalysis = await analyzeInteraction(model, conversationText, Object.keys(speakers));

    return {
      overall: overallAnalysis,
      speakers: speakerAnalyses,
      interaction: interactionAnalysis
    };

  } catch (error) {
    console.error('Gemini API 호출 오류:', error);
    
    // 오류 발생 시 기본 응답 반환
    return {
      overall: getDefaultOverallAnalysis(),
      speakers: getDefaultSpeakerAnalyses(speakers),
      interaction: getDefaultInteractionAnalysis()
    };
  }
}

// 전체 대화 분석 함수
async function analyzeOverallConversation(model, conversationText) {
  const prompt = `
다음은 회의 대화 내용입니다. 이 대화를 다음 기준에 따라 분석하고 평가해주세요:

1. 의사소통 명확성: 화자들이 얼마나 명확하게 의사를 전달했는지
2. 적극적 경청: 화자들이 서로의 의견을 경청하고 반응했는지  
3. 대화 효율성: 대화가 효율적으로 진행되었는지
4. 문제 해결 능력: 문제 제기와 해결책 제시가 적절했는지

각 기준별로 0.0에서 1.0 사이의 점수와 짧은 피드백을 제공해주세요.
마지막으로 전체적인 대화 평가를 요약해주세요.

**중요: 모든 피드백과 요약은 정중한 어조로 '~합니다', '~됩니다' 형태의 종결어미를 사용해주세요.**

응답은 다음과 같은 JSON 형식으로 제공해주세요:
{
  "criteria": [
    {
      "name": "기준명",
      "score": 점수(0.0~1.0),
      "feedback": "피드백 내용"
    }
  ],
  "summary": "전체 평가 요약"
}

대화 내용:
${conversationText}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  try {
    const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('JSON 형식을 찾을 수 없습니다.');
  } catch (parseError) {
    console.error('전체 분석 JSON 파싱 오류:', parseError);
    return getDefaultOverallAnalysis();
  }
}

// 화자별 개별 분석 함수
async function analyzeSpeakerIndividually(model, speakerText, speakerName) {
  const prompt = `
다음은 "${speakerName}"의 발화 내용입니다. 이 화자의 커뮤니케이션 스타일과 특성을 분석해주세요:

1. 발화 명확성: 말하는 내용이 얼마나 명확하고 이해하기 쉬운지
2. 논리성: 발언의 논리적 구조와 일관성
3. 적극성: 대화에 얼마나 적극적으로 참여하는지
4. 전문성: 주제에 대한 이해도와 전문적 지식

각 기준별로 0.0에서 1.0 사이의 점수와 짧은 피드백을 제공해주세요.
마지막으로 이 화자의 커뮤니케이션 특성을 요약해주세요.

**중요: 모든 피드백, 요약, 강점, 개선점은 정중한 어조로 '~합니다', '~됩니다' 형태의 종결어미를 사용해주세요.**

응답은 다음과 같은 JSON 형식으로 제공해주세요:
{
  "criteria": [
    {
      "name": "기준명", 
      "score": 점수(0.0~1.0),
      "feedback": "피드백 내용"
    }
  ],
  "summary": "화자 특성 요약",
  "strengths": ["강점1", "강점2"],
  "improvements": ["개선점1", "개선점2"]
}

${speakerName}의 발화 내용:
${speakerText}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  try {
    const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('JSON 형식을 찾을 수 없습니다.');
  } catch (parseError) {
    console.error(`${speakerName} 분석 JSON 파싱 오류:`, parseError);
    return getDefaultSpeakerAnalysis(speakerName);
  }
}

// 화자간 상호작용 분석 함수
async function analyzeInteraction(model, conversationText, speakerIds) {
  const prompt = `
다음은 ${speakerIds.length}명의 화자가 참여한 대화입니다. 화자들 간의 상호작용을 분석해주세요:

1. 상호작용 빈도: 화자들이 얼마나 자주 서로 반응하고 대화하는지
2. 균형도: 발화량이 화자들 간에 균형있게 분배되었는지
3. 협력성: 공동의 목표를 위해 협력하는지

각 기준별로 0.0에서 1.0 사이의 점수와 피드백을 제공해주세요.

**중요: 모든 피드백, 요약, 개선 제안은 정중한 어조로 '~합니다', '~됩니다' 형태의 종결어미를 사용해주세요.**

응답은 다음과 같은 JSON 형식으로 제공해주세요:
{
  "criteria": [
    {
      "name": "기준명",
      "score": 점수(0.0~1.0), 
      "feedback": "피드백 내용"
    }
  ],
  "summary": "상호작용 분석 요약",
  "recommendations": ["개선 제안1", "개선 제안2"]
}

대화 내용:
${conversationText}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  
  try {
    const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('JSON 형식을 찾을 수 없습니다.');
  } catch (parseError) {
    console.error('상호작용 분석 JSON 파싱 오류:', parseError);
    return getDefaultInteractionAnalysis();
  }
}

// 기본 분석 결과 함수들
function getDefaultOverallAnalysis() {
  return {
    criteria: [
      { name: "의사소통 명확성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "적극적 경청", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "대화 효율성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "문제 해결 능력", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
    ],
    summary: "API 오류로 인해 분석을 완료할 수 없었습니다."
  };
}

function getDefaultSpeakerAnalyses(speakers) {
  const analyses = {};
  Object.keys(speakers).forEach(speakerId => {
    analyses[speakerId] = getDefaultSpeakerAnalysis(speakers[speakerId]?.name || `화자 ${speakerId}`);
  });
  return analyses;
}

function getDefaultSpeakerAnalysis(speakerName) {
  return {
    criteria: [
      { name: "발화 명확성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "논리성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "적극성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "전문성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
    ],
    summary: `${speakerName}의 분석 중 오류가 발생했습니다.`,
    strengths: ["분석 불가"],
    improvements: ["분석 불가"]
  };
}

function getDefaultInteractionAnalysis() {
  return {
    criteria: [
      { name: "상호작용 빈도", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "균형도", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "협력성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
    ],
    summary: "상호작용 분석 중 오류가 발생했습니다.",
    recommendations: ["분석 불가"]
  };
} 
