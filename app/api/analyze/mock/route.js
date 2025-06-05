import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    console.log("목업 API: 요청 받음");
    
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    
    if (!audioFile) {
      return NextResponse.json(
        { error: "오디오 파일이 없습니다" },
        { status: 400 }
      );
    }
    
    console.log("목업 API: 파일 처리 중...", audioFile.name, audioFile.size, "bytes");
    
    // 실제 처리 시간 시뮬레이션 (2-3초)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
    
    // 목업 응답 데이터
    const mockResponse = {
      transcript: [
        {
          speaker: "0",
          text: "안녕하세요, 오늘 회의를 시작하겠습니다.",
          start: 0,
          end: 3
        },
        {
          speaker: "1", 
          text: "네, 좋습니다. 먼저 진행 상황을 공유하겠습니다.",
          start: 3.5,
          end: 7
        },
        {
          speaker: "0",
          text: "감사합니다. 각자 맡은 부분에 대해 얘기해보죠.",
          start: 7.5,
          end: 11
        },
        {
          speaker: "1",
          text: "제가 담당한 부분은 80% 정도 완성되었습니다.",
          start: 11.5,
          end: 15
        }
      ],
      speakers: {
        "0": {
          id: "0",
          name: "화자 1",
          color: "#3B82F6"
        },
        "1": {
          id: "1", 
          name: "화자 2",
          color: "#EF4444"
        }
      },
      analysis: {
        overall: {
          criteria: [
            {
              name: "의사소통 명확성",
              score: 0.85,
              feedback: "대화 참여자들이 명확하고 이해하기 쉽게 의사를 전달했습니다."
            },
            {
              name: "적극적 경청",
              score: 0.78,
              feedback: "서로의 의견을 잘 듣고 적절히 반응했습니다."
            },
            {
              name: "회의 효율성", 
              score: 0.82,
              feedback: "체계적으로 안건을 다루며 효율적인 회의를 진행했습니다."
            },
            {
              name: "문제 해결 능력",
              score: 0.75,
              feedback: "문제점을 명확히 제시하고 해결방안을 모색했습니다."
            },
            {
              name: "협력도",
              score: 0.88,
              feedback: "팀원 간 협력적인 자세로 회의에 임했습니다."
            }
          ],
          summary: "전반적으로 원활한 소통과 협력적인 분위기 속에서 효과적인 회의가 진행되었습니다."
        },
        speakers: {
          "0": {
            criteria: [
              { name: "발화 명확성", score: 0.87, feedback: "명확하고 체계적으로 발언했습니다." },
              { name: "논리성", score: 0.83, feedback: "논리적 순서로 내용을 전달했습니다." },
              { name: "적극성", score: 0.80, feedback: "회의를 적극적으로 리드했습니다." }
            ],
            summary: "회의를 체계적으로 이끌며 팀원들과 원활하게 소통했습니다.",
            strengths: ["명확한 회의 진행", "체계적인 안건 관리"],
            improvements: ["더 구체적인 질문으로 심도 있는 논의 유도"]
          },
          "1": {
            criteria: [
              { name: "발화 명확성", score: 0.82, feedback: "구체적이고 이해하기 쉽게 설명했습니다." },
              { name: "논리성", score: 0.78, feedback: "논리적으로 현황을 보고했습니다." },
              { name: "적극성", score: 0.75, feedback: "적극적으로 정보를 공유했습니다." }
            ],
            summary: "담당 업무에 대해 체계적으로 보고하며 협력적인 자세를 보였습니다.",
            strengths: ["구체적인 진행 상황 공유", "협조적인 태도"],
            improvements: ["더 적극적인 의견 제시"]
          }
        },
        interaction: {
          criteria: [
            { name: "상호 존중", score: 0.90, feedback: "서로를 존중하며 예의 바른 대화를 나누었습니다." },
            { name: "정보 공유", score: 0.85, feedback: "필요한 정보를 적극적으로 공유했습니다." }
          ],
          summary: "참여자들 간의 상호작용이 매우 원활했습니다.",
          recommendations: ["더 다양한 관점에서의 의견 교환"]
        }
      }
    };
    
    console.log("목업 API: 응답 전송");
    return NextResponse.json(mockResponse);
    
  } catch (error) {
    console.error("목업 API 오류:", error);
    return NextResponse.json(
      { error: "목업 API 처리 중 오류: " + error.message },
      { status: 500 }
    );
  }
}
