import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgxbtjxxqjmgemtoyauh.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_SERVICE_KEY_HERE'

// Service role key를 사용한 Supabase 클라이언트 (Storage 권한 필요)
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// API 키 환경 변수에서 가져오기
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBr3C6s-vWZR9LfI_Kc72jLQsI3bemd-Fk";
// Daglo API 키
const DAGLO_API_KEY = process.env.DAGLO_API_KEY || "LL9h2BxPTGGvjnj5zq4kDmo7";

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
    console.log('=== API 호출 시작 ===')
    
    // 파일 업로드 처리 - req.formData() 사용
    let formData;
    try {
      console.log('1. FormData 파싱 시작...')
      formData = await req.formData();
      console.log('1. FormData 파싱 완료')
    } catch (formError) {
      console.error('FormData 파싱 오류:', formError);
      return NextResponse.json(
        { error: `요청 데이터 처리 중 오류가 발생했습니다: ${formError.message}` },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const audioFile = formData.get('audio');
    
    if (!audioFile) {
      console.error('오디오 파일이 없음')
      return NextResponse.json(
        { error: '업로드된 오디오 파일이 없습니다' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('2. 오디오 파일 수신 완료:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    })

    // 요청 크기 확인
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > MAX_SIZE) {
      console.error('파일 크기 초과:', audioFile.size)
      return NextResponse.json(
        { error: `파일 크기가 너무 큽니다. 최대 50MB까지 업로드 가능합니다. (현재: ${Math.round(audioFile.size / 1024 / 1024 * 100) / 100}MB)` },
        { status: 413, headers: corsHeaders }
      );
    }

    // Supabase Storage 업로드 테스트
    let uploadedFilePath = null;
    
    try {
      console.log('3. Supabase Storage 업로드 시작...')
      
      // 파일을 arrayBuffer로 변환
      const fileBuffer = await audioFile.arrayBuffer();
      console.log(`파일 버퍼 생성 완료: ${fileBuffer.byteLength} bytes`);
      
      // Supabase Storage에 파일 업로드
      const fileExt = audioFile.name ? `.${audioFile.name.split('.').pop()}` : '.webm';
      const fileName = `audio_${Date.now()}${fileExt}`;
      const filePath = `temp/${fileName}`;
      
      console.log('Supabase Storage에 파일 업로드 중...', filePath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(filePath, fileBuffer, {
          contentType: audioFile.type || 'audio/webm'
        });

      if (uploadError) {
        console.error('Supabase 업로드 오류:', uploadError)
        throw new Error(`Supabase 업로드 실패: ${uploadError.message}`);
      }
      
      uploadedFilePath = uploadData.path;
      console.log('4. Supabase Storage 업로드 완료. Path:', uploadedFilePath);
      
      // 공개 URL 생성
      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(uploadedFilePath);
      
      console.log('5. 공개 URL 생성 완료:', publicUrl);
      
      // Daglo API를 사용한 화자분석 및 텍스트 변환
      console.log('6. Daglo API 호출 시작...')
      const transcript = await processSpeechWithDaglo(publicUrl);
      console.log('7. Daglo API 완료')
      
      // 임시 파일 삭제 (분석 완료 후)
      if (uploadedFilePath) {
        try {
          await supabase.storage
            .from('recordings')
            .remove([uploadedFilePath]);
          console.log('8. 임시 파일 삭제 완료');
        } catch (deleteError) {
          console.error('임시 파일 삭제 오류:', deleteError);
        }
      }

      // Daglo 테스트 성공 응답 (Gemini 분석 없이)
      const dagloTestResult = {
        transcript: transcript.transcript,
        speakers: transcript.speakers,
        analysis: {
          overall: {
            criteria: [
              { name: "의사소통 명확성", score: 0.85, feedback: "Daglo API 음성 분석이 성공적으로 완료되었습니다." }
            ],
            summary: "음성이 텍스트로 변환되고 화자가 분리되었습니다."
          },
          speakers: Object.keys(transcript.speakers).reduce((acc, speakerId) => {
            acc[speakerId] = {
              criteria: [
                { name: "발화 명확성", score: 0.85, feedback: "Daglo API로 화자 분석이 완료되었습니다." }
              ],
              summary: `${transcript.speakers[speakerId].name}의 발화가 인식되었습니다.`
            };
            return acc;
          }, {}),
          interaction: {
            criteria: [
              { name: "상호작용 빈도", score: 0.85, feedback: "화자간 대화가 분석되었습니다." }
            ],
            summary: "Daglo API를 통한 화자 분리가 완료되었습니다."
          }
        }
      }

      console.log('9. Daglo 테스트 응답 반환 완료')
      return NextResponse.json(dagloTestResult, { headers: corsHeaders });

    } catch (error) {
      console.error('Supabase Storage + Daglo API 처리 오류:', error);
      
      // 오류 발생 시 임시 파일 삭제
      if (uploadedFilePath) {
        try {
          await supabase.storage
            .from('recordings')
            .remove([uploadedFilePath]);
          console.log('오류 시 임시 파일 삭제 완료');
        } catch (deleteError) {
          console.error('오류 시 임시 파일 삭제 실패:', deleteError);
        }
      }
      
      return NextResponse.json(
        { error: `음성 분석 처리 중 오류가 발생했습니다: ${error.message}` },
        { status: 500, headers: corsHeaders }
      );
    }

    /* Gemini API 호출 코드 (마지막 단계에서 활성화)
    // Gemini API를 사용한 대화 분석
    console.log('8. Gemini API 호출 시작...')
    const analysisResult = await analyzeConversation(transcript.transcript, transcript.speakers);
    console.log('9. Gemini API 완료')

    console.log('11. 최종 응답 반환')
    // 분석 결과 반환 (파일 경로는 제거됨)
    return NextResponse.json({
      transcript: transcript.transcript,
      speakers: transcript.speakers,
      analysis: analysisResult,
    }, { headers: corsHeaders });
    */
  } catch (error) {
    console.error('=== 전체 API 오류 ===', error);
    console.error('오류 스택:', error.stack);
    return NextResponse.json(
      { error: `오디오 처리 중 오류가 발생했습니다: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Daglo API를 사용한 화자 분리 및 텍스트 변환 함수
async function processSpeechWithDaglo(audioUrl) {
  try {
    console.log('Daglo API 트랜스크립션 시작...');
    
    // API 키 확인
    if (!DAGLO_API_KEY) {
      throw new Error('Daglo API 키가 설정되지 않았습니다.');
    }
    
    console.log('Daglo API 키 확인 완료, API 호출 시작...');
    console.log('사용 URL:', audioUrl);
    
    // Daglo API 요청 옵션 (공식 문서에 따른 올바른 구조)
    const requestOptions = {
      audio: {
        source: {
          url: audioUrl
        }
      },
      sttConfig: {
        speakerDiarization: {
          enable: true,
          maxSpeakers: 6
        },
        wordAlignment: true,
        punctuation: true
      }
    };
    
    // API 요청 URL
    const apiUrl = 'https://apis.daglo.ai/stt/v1/async/transcripts';
    
    // 1단계: 트랜스크립션 요청
    console.log('Daglo API 트랜스크립션 요청 중...');
    console.log('요청 옵션:', JSON.stringify(requestOptions, null, 2));
    
    const submitResponse = await axios.post(apiUrl, requestOptions, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAGLO_API_KEY}`
      }
    });
    
    if (!submitResponse.data || !submitResponse.data.rid) {
      throw new Error('Daglo API 요청 응답에서 RID를 찾을 수 없습니다.');
    }
    
    const rid = submitResponse.data.rid;
    console.log('트랜스크립션 요청 완료. RID:', rid);
    
    // 2단계: 결과 폴링
    const maxRetries = 60; // 최대 10분 대기
    const retryInterval = 10000; // 10초마다 확인
    
    for (let i = 0; i < maxRetries; i++) {
      console.log(`트랜스크립션 상태 확인 중... (${i + 1}/${maxRetries})`);
      
      const resultResponse = await axios.get(`${apiUrl}/${rid}`, {
        headers: {
          'Authorization': `Bearer ${DAGLO_API_KEY}`
        }
      });
      
      console.log(`상태: ${resultResponse.data.status}`);
      
      if (resultResponse.data.status === 'transcribed') {
        console.log('트랜스크립션 완료');
        const result = resultResponse.data;
        
        // 전체 응답 구조 상세 로깅
        console.log('=== Daglo API 전체 응답 구조 ===');
        console.log(JSON.stringify(result, null, 2));
        
        // 결과 변환
        return convertDagloResults(result);
      } else if (resultResponse.data.status === 'transcript_error' || resultResponse.data.status === 'file_error') {
        throw new Error(`Daglo API 오류: ${resultResponse.data.status}`);
      }
      
      // 상태가 완료되지 않았으면 대기
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
    
    throw new Error('Daglo API 응답 대기 시간 초과');
  } catch (error) {
    console.error('Daglo API 오류:', error);
    console.error('오류 상세 내용:', error.response?.data || '상세 정보 없음');
    throw new Error(`Daglo API 처리 중 오류 발생: ${error.message}`);
  }
}

// Daglo API 결과 변환 함수
function convertDagloResults(dagloResult) {
  try {
    console.log('Daglo 결과 변환 시작...');
    
    // 화자 색상 지정
    const speakerColors = {
      '1': '#3B82F6', // blue
      '2': '#EF4444', // red
      '3': '#10B981', // green
      '4': '#F59E0B', // yellow
      '5': '#8B5CF6', // purple
      '6': '#EC4899', // pink
    };
    
    const segments = [];
    const speakersMap = {};
    
    if (dagloResult.sttResults && dagloResult.sttResults.length > 0) {
      const sttResult = dagloResult.sttResults[0];
      
      console.log('=== STT 결과 분석 ===');
      console.log('전체 transcript:', sttResult.transcript);
      console.log('words 배열 길이:', sttResult.words ? sttResult.words.length : 0);
      
      if (sttResult.words && sttResult.words.length > 0) {
        console.log('=== 첫 10개 단어 분석 ===');
        sttResult.words.slice(0, 10).forEach((word, index) => {
          console.log(`${index + 1}. 단어: "${word.word}", speaker: ${word.speaker}, segmentId: ${word.segmentId}, 시작: ${word.startTime?.seconds}s`);
        });
        
        // speaker 필드를 기준으로 화자별 세그먼트 생성
        let currentSpeaker = null;
        let currentText = '';
        let segmentStart = null;
        let segmentEnd = null;
        let speakers = new Set();
        
        for (const word of sttResult.words) {
          const speakerId = word.speaker || '1'; // 실제 화자 ID 사용
          const startTime = parseFloat(word.startTime?.seconds || 0) + (word.startTime?.nanos || 0) / 1000000000;
          const endTime = parseFloat(word.endTime?.seconds || 0) + (word.endTime?.nanos || 0) / 1000000000;
          
          speakers.add(speakerId);
          
          // 새로운 화자이거나 첫 번째 단어인 경우
          if (currentSpeaker !== speakerId) {
            // 이전 세그먼트를 저장
            if (currentSpeaker !== null && currentText.trim()) {
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
          } else {
            // 같은 화자인 경우 텍스트 연결
            if (word.word) {
              currentText += word.word;
            }
            segmentEnd = endTime;
          }
        }
        
        // 마지막 세그먼트 저장
        if (currentSpeaker !== null && currentText.trim()) {
          segments.push({
            speaker: currentSpeaker,
            text: currentText.trim(),
            start: segmentStart,
            end: segmentEnd
          });
        }
        
        // 화자 정보 생성 (실제 사용된 speaker ID 기반)
        Array.from(speakers).forEach(speakerId => {
          const speakerNumber = parseInt(speakerId);
          speakersMap[speakerId] = {
            id: speakerId,
            name: `화자 ${speakerNumber}`,
            color: speakerColors[speakerId] || '#374151'
          };
        });
        
        console.log('=== 세그먼트 생성 결과 ===');
        console.log('고유 speaker ID 목록:', Array.from(speakers));
        console.log('생성된 세그먼트 수:', segments.length);
        console.log('화자 수:', Object.keys(speakersMap).length);
        
        // 각 세그먼트 미리보기
        segments.slice(0, 10).forEach((segment, index) => {
          console.log(`세그먼트 ${index + 1}: 화자 ${segment.speaker} - "${segment.text.substring(0, 50)}..."`);
        });
        
      } else {
        // 단어 정보가 없는 경우 전체 텍스트만 사용
        console.log('단어 정보가 없음, 전체 텍스트 사용');
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
      console.log('STT 결과가 없음');
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
    
    console.log('=== 최종 변환 결과 ===');
    console.log(`세그먼트 수: ${segments.length}`);
    console.log(`화자 수: ${Object.keys(speakersMap).length}`);
    console.log('화자 ID 목록:', Object.keys(speakersMap));
    
    return {
      transcript: segments,
      speakers: speakersMap
    };
  } catch (error) {
    console.error('Daglo 결과 변환 오류:', error);
    throw new Error(`결과 변환 중 오류 발생: ${error.message}`);
  }
}

// Gemini API를 사용한 대화 분석
async function analyzeConversation(transcript, speakers) {
  try {
    // API 키 확인
    const apiKey = GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }
    
    console.log('Gemini API 키 확인 완료, 종합 분석 시작...');
    
    // Gemini API 초기화
    const genAI = new GoogleGenerativeAI(apiKey);
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
    console.error('Gemini API 호출 중 오류:', error);
    
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
3. 회의 효율성: 대화가 효율적으로 진행되었는지
4. 문제 해결 능력: 문제 제기와 해결책 제시가 적절했는지
5. 협력도: 화자들이 협력적으로 대화했는지

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
5. 감정 조절: 감정적으로 안정된 대화를 하는지

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
3. 상호 존중: 서로의 의견을 존중하고 예의있게 대화하는지
4. 협력성: 공동의 목표를 위해 협력하는지
5. 갈등 해결: 의견 충돌이 있을 때 건설적으로 해결하는지

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
      { name: "회의 효율성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "문제 해결 능력", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "협력도", score: 0.7, feedback: "분석 중 오류가 발생했습니다." }
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
      { name: "감정 조절", score: 0.7, feedback: "분석 중 오류가 발생했습니다." }
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
      { name: "상호 존중", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "협력성", score: 0.7, feedback: "분석 중 오류가 발생했습니다." },
      { name: "갈등 해결", score: 0.7, feedback: "분석 중 오류가 발생했습니다." }
    ],
    summary: "상호작용 분석 중 오류가 발생했습니다.",
    recommendations: ["분석 불가"]
  };
} 