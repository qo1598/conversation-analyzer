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
        // segmentId를 기준으로 화자별 세그먼트 생성
        let currentSegmentId = null;
        let currentText = '';
        let segmentStart = null;
        let segmentEnd = null;
        let uniqueSegmentIds = new Set();
        
        for (const word of sttResult.words) {
          const segmentId = word.segmentId || word.speaker || '1';
          const startTime = parseFloat(word.startTime?.seconds || 0) + (word.startTime?.nanos || 0) / 1000000000;
          const endTime = parseFloat(word.endTime?.seconds || 0) + (word.endTime?.nanos || 0) / 1000000000;
          
          uniqueSegmentIds.add(segmentId);
          
          if (currentSegmentId !== segmentId) {
            if (currentSegmentId !== null && currentText.trim()) {
              segments.push({
                speaker: currentSegmentId,
                text: currentText.trim(),
                start: segmentStart,
                end: segmentEnd
              });
            }
            
            currentSegmentId = segmentId;
            currentText = word.word || '';
            segmentStart = startTime;
            segmentEnd = endTime;
          } else {
            if (word.word) {
              currentText += word.word;
            }
            segmentEnd = endTime;
          }
        }
        
        // 마지막 세그먼트 저장
        if (currentSegmentId !== null && currentText.trim()) {
          segments.push({
            speaker: currentSegmentId,
            text: currentText.trim(),
            start: segmentStart,
            end: segmentEnd
          });
        }
        
        // 화자 정보 생성
        Array.from(uniqueSegmentIds).forEach(segmentId => {
          const speakerNumber = parseInt(segmentId) || 1;
          speakersMap[segmentId] = {
            id: segmentId,
            name: `화자 ${speakerNumber}`,
            color: speakerColors[segmentId] || '#374151'
          };
        });
        
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

// 간단한 Gemini API 대화 분석 함수
async function analyzeConversation(transcript, speakers) {
  try {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }
    
    console.log('Gemini API 분석 시작...');
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 간단한 전체 분석만 수행
    const limitedTranscript = transcript.slice(0, 20);
    const conversationText = limitedTranscript
      .map(item => `${speakers[item.speaker]?.name || `화자 ${item.speaker}`}: ${item.text}`)
      .join('\n');

    const prompt = `
다음 대화를 분석하고 간단한 평가를 해주세요:

${conversationText}

다음 JSON 형식으로 응답해주세요:
{
  "overall": {
    "criteria": [
      {"name": "의사소통 명확성", "score": 0.8, "feedback": "명확하게 의사소통했습니다"},
      {"name": "적극적 경청", "score": 0.7, "feedback": "서로의 의견을 잘 들었습니다"}
    ],
    "summary": "전체적으로 좋은 대화였습니다"
  }
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
      const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Gemini 분석 완료');
        return parsed;
      }
    } catch (parseError) {
      console.error('Gemini 응답 파싱 오류:', parseError);
    }
    
    // 파싱 실패 시 기본 응답
    return {
      overall: {
        criteria: [
          { name: "의사소통 명확성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
          { name: "적극적 경청", score: 0.7, feedback: "분석 중 오류가 발생했습니다." }
        ],
        summary: "분석을 완료했지만 상세 결과 생성 중 오류가 발생했습니다."
      },
      speakers: {},
      interaction: { criteria: [], summary: "", recommendations: [] }
    };

  } catch (error) {
    console.error('Gemini API 호출 오류:', error);
    
    // 오류 발생 시 기본 응답 반환
    return {
      overall: {
        criteria: [
          { name: "의사소통 명확성", score: 0.7, feedback: "API 오류로 분석할 수 없습니다." },
          { name: "적극적 경청", score: 0.7, feedback: "API 오류로 분석할 수 없습니다." }
        ],
        summary: "API 오류로 인해 분석을 완료할 수 없었습니다."
      },
      speakers: {},
      interaction: { criteria: [], summary: "", recommendations: [] }
    };
  }
} 