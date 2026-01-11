import axios from 'axios'

// Daglo API 키 확인
const DAGLO_API_KEY = process.env.DAGLO_API_KEY || "LL9h2BxPTGGvjnj5zq4kDmo7";

// Daglo API에 요청만 보내고 RID 받기
export async function submitToDagloAPI(audioUrl) {
  try {
    console.log('Daglo API 요청 시작...');
    
    // API 키 확인
    if (!DAGLO_API_KEY) {
      throw new Error('Daglo API 키가 설정되지 않았습니다.');
    }
    
    console.log('Daglo API 키 확인 완료, API 호출 시작...');
    console.log('사용 URL:', audioUrl);
    
    // API 요청 URL
    const apiUrl = 'https://apis.daglo.ai/stt/v1/async/transcripts';
    
    // Daglo API 요청 옵션
    const requestOptions = {
      audio: {
        source: {
          url: audioUrl
        }
      },
      sttConfig: {
        speakerDiarization: {
          enable: true
        }
      }
    };
    
    // 트랜스크립션 요청
    console.log('Daglo API 트랜스크립션 요청 중...');
    
    const submitResponse = await axios.post(apiUrl, requestOptions, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAGLO_API_KEY}`
      }
    });
    
    console.log('Daglo API 제출 응답 status:', submitResponse.status);
    
    if (!submitResponse.data || !submitResponse.data.rid) {
      throw new Error('Daglo API 요청 응답에서 RID를 찾을 수 없습니다.');
    }
    
    const rid = submitResponse.data.rid;
    console.log('트랜스크립션 요청 완료. RID:', rid);
    
    return rid;
    
  } catch (error) {
    console.error('Daglo API 요청 오류:', error);
    throw new Error(`Daglo API 요청 중 오류 발생: ${error.message}`);
  }
}

// Daglo API를 사용한 화자 분리 및 텍스트 변환 함수 (전체 프로세스)
export async function processSpeechWithDaglo(audioUrl) {
  try {
    const rid = await submitToDagloAPI(audioUrl);
    return await pollDagloResults(rid);
  } catch (error) {
    console.error('Daglo API 처리 중 오류:', error);
    throw new Error(`Daglo API 처리 중 오류 발생: ${error.message}`);
  }
}

// 결과 폴링 함수
export async function pollDagloResults(rid) {
  const apiUrl = 'https://apis.daglo.ai/stt/v1/async/transcripts';
  const maxRetries = 9; // 최대 54초 대기 (9 * 6초)
  const retryInterval = 6000; // 6초마다 확인
  
  for (let i = 0; i < maxRetries; i++) {
    console.log(`트랜스크립션 상태 확인 중... (${i + 1}/${maxRetries}) - ${i * 6}초 경과`);
    
    const resultResponse = await axios.get(`${apiUrl}/${rid}`, {
      headers: {
        'Authorization': `Bearer ${DAGLO_API_KEY}`
      }
    });
    
    const status = resultResponse.data.status;
    console.log(`상태: ${status}`);
    
    if (status === 'transcribed') {
      console.log('트랜스크립션 완료');
      return convertDagloResults(resultResponse.data);
    } else if (status === 'transcript_error' || status === 'file_error') {
      throw new Error(`Daglo API 오류: ${status}`);
    }
    
    // 상태가 완료되지 않았으면 대기
    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }
  
  throw new Error('Daglo API 응답 대기 시간 초과 (54초) - 더 짧은 오디오 파일을 사용해주세요');
}

// Daglo API 결과 변환 함수
function convertDagloResults(dagloResult) {
  try {
    console.log('=== Daglo 결과 변환 시작 ===');
    
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
      
      if (sttResult.words && sttResult.words.length > 0) {
        try {
          // 1단계: 모든 고유 화자 ID 수집
          const allSpeakers = new Set();
          sttResult.words.forEach(word => {
            const speakerId = word.speaker || '1'; 
            allSpeakers.add(speakerId);
          });
          
          // 2단계: 화자별 세그먼트 생성
          let currentSpeaker = null;
          let currentText = '';
          let segmentStart = null;
          let segmentEnd = null;
          let wordCount = 0;
          
          for (const word of sttResult.words) {
            const speakerId = word.speaker || '1';
            const startTime = parseFloat(word.startTime?.seconds || 0) + (word.startTime?.nanos || 0) / 1000000000;
            const endTime = parseFloat(word.endTime?.seconds || 0) + (word.endTime?.nanos || 0) / 1000000000;
            
            if (currentSpeaker !== speakerId) {
              // 이전 세그먼트 저장
              if (currentSpeaker !== null && currentText.trim() && wordCount >= 1) {
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
          if (currentSpeaker !== null && currentText.trim()) {
            segments.push({
              speaker: currentSpeaker,
              text: currentText.trim(),
              start: segmentStart,
              end: segmentEnd
            });
          }
          
          // 3단계: 화자 정보 생성
          const usedSpeakers = new Set(segments.map(s => s.speaker));
          usedSpeakers.forEach(speakerId => {
            const speakerNumber = parseInt(speakerId) || 1;
            speakersMap[speakerId] = {
              id: speakerId,
              name: `화자 ${speakerNumber}`,
              color: speakerColors[speakerId] || speakerColors[String(speakerNumber)] || '#374151'
            };
          });
          
        } catch (processingError) {
          console.error('단어 처리 중 오류:', processingError);
          // Fallback
          segments.push({
            speaker: '1',
            text: sttResult.transcript || '음성 인식 결과 처리 중 오류가 발생했습니다',
            start: 0,
            end: 10
          });
          speakersMap['1'] = { id: '1', name: '화자 1', color: speakerColors['1'] };
        }
        
      } else {
        // 단어 정보 없음
        segments.push({
          speaker: '1',
          text: sttResult.transcript || '음성 인식 결과가 없습니다',
          start: 0,
          end: 10
        });
        speakersMap['1'] = { id: '1', name: '화자 1', color: speakerColors['1'] };
      }
    } else {
      // 결과 없음
      segments.push({
        speaker: '1',
        text: '음성 인식 결과가 없습니다',
        start: 0,
        end: 1
      });
      speakersMap['1'] = { id: '1', name: '화자 1', color: speakerColors['1'] };
    }
    
    return {
      transcript: segments,
      speakers: speakersMap
    };
    
  } catch (error) {
    console.error('Daglo 결과 변환 오류:', error);
    return {
      transcript: [{ speaker: '1', text: '결과 변환 중 오류가 발생했습니다', start: 0, end: 1 }],
      speakers: { '1': { id: '1', name: '화자 1', color: '#3B82F6' } }
    };
  }
}
