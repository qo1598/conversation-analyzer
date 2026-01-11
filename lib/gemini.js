import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBP4odtkyJ9IA9f9ltND1SsDiMmVLyqK30";

// Gemini API를 사용한 대화 분석
export async function analyzeConversation(transcript, speakers) {
    try {
        if (!GEMINI_API_KEY) {
            throw new Error('Gemini API 키가 설정되지 않았습니다.');
        }

        console.log('Gemini API 분석 시작...');

        // Gemini API 초기화
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // 전체 대화 텍스트 생성 (처음 50개 세그먼트로 제한하여 토큰 절약)
        const limitedTranscript = transcript.slice(0, 50);
        const conversationText = limitedTranscript
            .map(item => `${speakers[item.speaker]?.name || `화자 ${item.speaker}`}: ${item.text}`)
            .join('\n');

        // 화자별 텍스트 모음
        const speakerTexts = {};
        Object.keys(speakers).forEach(speakerId => {
            speakerTexts[speakerId] = limitedTranscript
                .filter(item => item.speaker === speakerId)
                .map(item => item.text)
                .join(' ');
        });

        // 병렬로 분석 요청 실행 (속도 최적화)
        const [overallAnalysis, interactionAnalysis] = await Promise.all([
            analyzeOverallConversation(model, conversationText),
            analyzeInteraction(model, conversationText, Object.keys(speakers))
        ]);

        // 화자별 분석은 화자 수만큼 반복 (병렬 처리)
        const speakerAnalysisPromises = Object.entries(speakerTexts).map(async ([speakerId, text]) => {
            if (!text.trim()) return [speakerId, getDefaultSpeakerAnalysis(speakers[speakerId]?.name)];

            const analysis = await analyzeSpeakerIndividually(
                model,
                text,
                speakers[speakerId]?.name || `화자 ${speakerId}`
            );
            return [speakerId, analysis];
        });

        const speakerAnalysesEntries = await Promise.all(speakerAnalysisPromises);
        const speakerAnalyses = Object.fromEntries(speakerAnalysesEntries);

        return {
            overall: overallAnalysis,
            speakers: speakerAnalyses,
            interaction: interactionAnalysis
        };

    } catch (error) {
        console.error('Gemini API 호출 중 오류:', error);
        return {
            overall: getDefaultOverallAnalysis(),
            speakers: getDefaultSpeakerAnalyses(speakers),
            interaction: getDefaultInteractionAnalysis()
        };
    }
}

// 1. 전체 대화 분석
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

**중요: 피드백과 요약은 '해요체'(~해요)나 정중한 문체를 사용해주세요.**

응답은 오직 JSON 형식으로만 제공해주세요:
{
  "criteria": [
    { "name": "의사소통 명확성", "score": 0.8, "feedback": "..." },
    ...
  ],
  "summary": "..."
}

대화 내용:
${conversationText}
`;

    return await generateAndParseJSON(model, prompt, getDefaultOverallAnalysis());
}

// 2. 화자별 개별 분석
async function analyzeSpeakerIndividually(model, speakerText, speakerName) {
    const prompt = `
다음은 "${speakerName}"의 발화 내용입니다. 스타일과 특성을 분석해주세요:
1. 발화 명확성
2. 논리성
3. 적극성
4. 전문성
5. 감정 조절

각 기준별 점수(0.0~1.0)와 피드백, 그리고 강점/개선점을 추출해주세요.

**중요: 피드백은 정중한 문체를 사용해주세요.**

응답은 오직 JSON 형식으로만 제공해주세요:
{
  "criteria": [...],
  "summary": "...",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]
}

${speakerName}의 발화:
${speakerText}
`;

    return await generateAndParseJSON(model, prompt, getDefaultSpeakerAnalysis(speakerName));
}

// 3. 상호작용 분석
async function analyzeInteraction(model, conversationText, speakerIds) {
    const prompt = `
${speakerIds.length}명의 화자가 참여한 대화입니다. 상호작용을 분석해주세요:
1. 상호작용 빈도
2. 균형도
3. 상호 존중
4. 협력성
5. 갈등 해결

각 기준별 점수(0.0~1.0)와 피드백, 개선 추천사항을 제공해주세요.

**중요: 피드백은 정중한 문체를 사용해주세요.**

응답은 오직 JSON 형식으로만 제공해주세요:
{
  "criteria": [...],
  "summary": "...",
  "recommendations": ["...", "..."]
}

대화 내용:
${conversationText}
`;

    return await generateAndParseJSON(model, prompt, getDefaultInteractionAnalysis());
}

// 헬퍼: JSON 생성 및 파싱 안전 처리
async function generateAndParseJSON(model, prompt, fallbackValue) {
    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // JSON 블록 추출
        const cleanText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        // 중괄호로 시작하는지 확인하여 JSON 부분만 추출 시도
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return JSON.parse(cleanText); // 매치 안되면 전체 시도
    } catch (error) {
        console.error('JSON 파싱 오류:', error);
        return fallbackValue;
    }
}

// === 기본값 데이터 생성기 (오류 시 Fallback) ===

function getDefaultOverallAnalysis() {
    return {
        criteria: [
            { name: "의사소통 명확성", score: 0.5, feedback: "분석을 완료할 수 없습니다." },
            { name: "적극적 경청", score: 0.5, feedback: "분석을 완료할 수 없습니다." },
            { name: "회의 효율성", score: 0.5, feedback: "분석을 완료할 수 없습니다." },
            { name: "문제 해결 능력", score: 0.5, feedback: "분석을 완료할 수 없습니다." },
            { name: "협력도", score: 0.5, feedback: "분석을 완료할 수 없습니다." }
        ],
        summary: "일시적인 오류로 상세 분석을 생성하지 못했습니다."
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
            { name: "발화 명확성", score: 0.5, feedback: "데이터 부족" },
            { name: "논리성", score: 0.5, feedback: "데이터 부족" },
            { name: "적극성", score: 0.5, feedback: "데이터 부족" },
            { name: "전문성", score: 0.5, feedback: "데이터 부족" },
            { name: "감정 조절", score: 0.5, feedback: "데이터 부족" }
        ],
        summary: `${speakerName}에 대한 분석 데이터를 충분히 확보하지 못했습니다.`,
        strengths: ["-"],
        improvements: ["-"]
    };
}

function getDefaultInteractionAnalysis() {
    return {
        criteria: [
            { name: "상호작용 빈도", score: 0.5, feedback: "분석 불가" },
            { name: "균형도", score: 0.5, feedback: "분석 불가" },
            { name: "상호 존중", score: 0.5, feedback: "분석 불가" },
            { name: "협력성", score: 0.5, feedback: "분석 불가" },
            { name: "갈등 해결", score: 0.5, feedback: "분석 불가" }
        ],
        summary: "상호작용 패턴을 분석할 수 없습니다.",
        recommendations: ["다시 시도해주세요."]
    };
}
