# 대화 분석 시스템

이 프로젝트는 녹음된 대화 파일을 업로드하여 화자를 구분하고 텍스트로 변환한 후, 대화 내용을 종합적으로 분석하는 웹 애플리케이션입니다. 특히 한국어 음성 파일에 최적화되어 있습니다.

## 🎯 주요 기능

### 📄 대화 처리
1. **오디오 파일 업로드 및 처리** - WAV, MP3 등 다양한 형식 지원
2. **화자 분리(Speaker Diarization)** - 최대 6명까지 자동 화자 구분
3. **음성-텍스트 변환(STT)** - 한국어 최적화된 고정밀 음성 인식
4. **드롭다운 필터링** - 화자별 대화 내용 선택적 확인

### 🔍 종합 분석 시스템
1. **전체 대화 평가**
   - 의사소통 명확성
   - 적극적 경청
   - 회의 효율성
   - 문제 해결 능력
   - 협력도

2. **화자별 개별 평가**
   - 발화 명확성
   - 논리성
   - 적극성
   - 전문성
   - 감정 조절
   - 강점 및 개선점 분석

3. **상호작용 분석**
   - 상호작용 빈도
   - 균형도
   - 상호 존중
   - 협력성
   - 갈등 해결

### 🎨 사용자 인터페이스
- **직관적인 탭 기반 네비게이션**
- **화자별 색상 구분 시스템**
- **실시간 막대그래프 및 퍼센테이지 표시**
- **반응형 디자인**

## 🛠 기술 스택

- **Next.js 15.3.2** - 웹 프레임워크
- **Daglo API** - 화자 분리 및 음성-텍스트 변환 (한국어 최적화)
- **Google Gemini API** - AI 기반 대화 내용 분석
- **Firebase Storage** - 임시 파일 저장
- **커스텀 CSS** - UI 디자인 (Tailwind 대신 성능 최적화)

## 🚀 설치 및 실행

### 1. 저장소 클론
```bash
git clone https://github.com/qo1598/conversation-analyzer.git
cd conversation-analyzer
```

### 2. 종속성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 API 키들을 설정하세요:

```env
# Gemini API 키 (Google AI Studio에서 발급)
GEMINI_API_KEY=your_gemini_api_key

# Daglo API 키 (https://console.daglo.ai에서 발급)
DAGLO_API_KEY=your_daglo_api_key

# Firebase 설정 (선택사항 - 기본값 사용 가능)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
```

### 4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속하여 애플리케이션을 확인하세요.

## 📋 API 키 발급 가이드

### Daglo API 키 발급
1. [Daglo 콘솔](https://console.daglo.ai)에 회원가입
2. API 키 섹션에서 새 토큰 발급
3. 한국어 음성 인식에 최적화된 설정 사용

### Google Gemini API 키 발급
1. [Google AI Studio](https://aistudio.google.com)에 접속
2. API 키 생성
3. 대화 분석 및 평가에 사용

## 🎯 한국어 최적화 특징

- **Daglo API의 한국어 전용 모델** 사용
- **화자 분리 정확도** 향상을 위한 한국어 특화 설정
- **문맥 기반 분석** - 한국어 대화 패턴 이해
- **정중한 어조** - ~합니다 종결어미 통일

## 🌐 배포

### Vercel 자동 배포
이 저장소는 Vercel과 자동 동기화되어 있습니다:
- GitHub에 푸시하면 자동으로 배포됩니다
- 환경 변수는 Vercel 대시보드에서 설정하세요

### 수동 배포
```bash
npm run build
```

## 📊 사용 방법

1. **음성 파일 업로드**: WAV, MP3 등의 대화 녹음 파일을 업로드
2. **화자 분리 확인**: 자동으로 구분된 화자별 대화 내용 확인
3. **필터링**: 드롭다운에서 특정 화자의 발화만 선택적으로 확인
4. **분석 결과 확인**:
   - 전체 대화 평가
   - 화자별 개별 분석  
   - 상호작용 분석

## ⚠️ 주의사항

- API 사용량에 따라 요금이 발생할 수 있습니다
- 오디오 파일은 분석 후 자동으로 삭제됩니다
- 최적의 화자 분리를 위해 깨끗한 음질의 녹음을 권장합니다
- 배경 소음이 적고 화자 간 음성 특성이 구별되는 환경에서 녹음하세요

## 🔧 트러블슈팅

### 화자 분리 정확도 개선
- 명확하게 구분되는 음성 특성을 가진 화자들
- 배경 소음 최소화
- 한 사람씩 번갈아 발화하는 대화 패턴

### API 오류 해결
- Daglo API 키와 권한 확인
- Gemini API 할당량 확인
- 네트워크 연결 상태 점검

## 🎨 커스터마이징

- `app/api/analyze/route.js`: API 처리 로직 수정
- `app/components/ConversationAnalysis.js`: UI 컴포넌트 수정
- `app/styles/globals.css`: 스타일 커스터마이징

## 📈 성능 최적화

- Next.js 15.3.2의 최신 기능 활용
- 커스텀 CSS로 번들 크기 최적화
- Firebase를 통한 효율적인 파일 관리
- Vercel Edge Functions 활용

## 🤝 기여

이 프로젝트에 기여하고 싶으시면 Pull Request를 보내주세요!

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 제공됩니다. 