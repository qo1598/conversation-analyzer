# 대화 분석 시스템

이 프로젝트는 녹음된 대화 파일을 업로드하여 화자를 구분하고 텍스트로 변환한 후, 대화 내용을 분석하는 웹 애플리케이션입니다. 특히 한국어 음성 파일에 최적화되어 있으며, 화자별로 대화 내용을 필터링하여 볼 수 있는 기능을 제공합니다.

## 주요 기능

1. **오디오 파일 업로드 및 처리** - 다양한 형식의 오디오 파일 지원 (최대 4시간, 2GB)
2. **화자 분리(Speaker Diarization)** - Daglo API를 통한 고정밀 화자 구분
3. **음성-텍스트 변환(STT)** - 한국어, 영어, 일본어 지원
4. **대화 내용 분석 및 평가** - AI 기반 대화 품질 평가
5. **화자별 필터링 기능** - 드롭다운으로 특정 화자의 대화만 선택적으로 보기
6. **시각적 결과 표시** - 직관적인 웹 인터페이스

## 🆕 새로운 기능

### Daglo API 통합
- 기존 CLOVA Speech API에서 **Daglo API**로 업그레이드
- 더 정확한 한국어 화자분석 지원
- 비동기 처리로 긴 오디오 파일 지원 (최대 4시간)
- 실시간 처리 상태 모니터링

### 화자별 필터링 기능
- 음성 파일 분석 후 **화자별로 대화 내용 분리**
- **드롭다운 메뉴**로 특정 화자 선택 가능
- 선택한 화자의 발화만 필터링하여 표시
- 화자별 발화 수 및 색상 구분 표시

## 기술 스택

- **Next.js** - 웹 프레임워크
- **Daglo API** - 화자 분리 및 음성-텍스트 변환 (한국어 최적화)
- **Google Gemini API** - 대화 내용 분석
- **Firebase Storage** - 임시 파일 저장
- **Tailwind CSS** - UI 디자인

## 설치 방법

1. 저장소 클론:
```bash
git clone [repository-url]
cd conversation-analyzer
```

2. 종속성 설치:
```bash
npm install
```

3. 환경 변수 설정:

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Daglo API 설정
DAGLO_API_KEY=your_daglo_api_key_here

# Firebase 설정
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

# Gemini API 설정
GEMINI_API_KEY=your_gemini_api_key
```

## API 설정 가이드

### 1. Daglo API 설정

1. [Daglo Console](https://console.daglo.ai/)에서 계정을 생성합니다.
2. 토큰 메뉴에서 새 토큰을 발급합니다.
3. 발급받은 토큰을 `DAGLO_API_KEY`에 설정합니다.

### 2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트를 생성합니다.
2. Storage를 활성화합니다.
3. 프로젝트 설정에서 웹 앱 구성 정보를 복사하여 환경 변수에 설정합니다.

### 3. Google Gemini API 설정

1. [Google AI Studio](https://ai.google.dev/)에서 API 키를 생성합니다.
2. 발급받은 키를 `GEMINI_API_KEY`에 설정합니다.

## 로컬에서 실행하기

개발 서버 시작:
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 애플리케이션을 확인합니다.

## 사용 방법

1. **오디오 파일 업로드**: 지원 형식(.mp3, .wav, .m4a, .flac 등)의 음성 파일을 업로드
2. **자동 분석**: Daglo API가 화자 분리 및 텍스트 변환을 수행
3. **결과 확인**: 
   - **대화 내용** 탭에서 화자별로 분리된 대화 내용 확인
   - **화자 선택 드롭다운**으로 특정 화자의 발화만 필터링하여 보기
   - **평가 결과** 탭에서 AI 기반 대화 품질 평가 확인

## 화자별 필터링 기능 사용법

### 전체 대화 보기
- 드롭다운에서 **"전체 보기"** 선택
- 모든 화자의 대화가 시간순으로 표시됩니다

### 특정 화자 대화만 보기
- 드롭다운에서 원하는 화자 선택 (예: "화자 1", "화자 2")
- 선택한 화자의 발화만 필터링되어 표시됩니다
- 화자 정보 박스에 선택된 화자의 색상과 발화 수가 표시됩니다

### 화자별 구분 요소
- **색상**: 각 화자마다 고유한 색상으로 구분
- **번호**: 화자 1, 화자 2, 화자 3... 형태로 표시
- **발화 수**: 선택한 화자의 총 발화 개수 표시

## 지원 언어 및 형식

### 지원 언어
- **한국어** (ko) - 기본 및 최적화
- **영어** (en)
- **일본어** (ja)
- **한국어+영어 혼합** (코드스위칭 지원)

### 지원 오디오 형식
- **오디오**: .3gp, .aac, .aiff, .amr, .au, .flac, .m4a, .mp3, .opus, .ra, .wav, .weba
- **비디오**: .asx, .avi, .ogm, .ogv, .m4v, .mov, .mp4, .mpeg, .mpg, .wmv
- **제한사항**: 파일 크기 최대 2GB, 재생 시간 최대 4시간

## 배포

Next.js 애플리케이션은 Vercel 또는 다른 Next.js 호스팅 서비스에 쉽게 배포할 수 있습니다:

```bash
npm run build
npm run start
```

배포 시 다음 사항에 주의하세요:
- 모든 환경 변수를 호스팅 서비스에 설정
- API 사용량 및 비용 모니터링
- CORS 설정 확인

## 주의사항

- **API 비용**: Daglo API, Gemini API는 사용량에 따라 비용이 발생할 수 있습니다.
- **데이터 보안**: 오디오 파일은 임시적으로 Firebase Storage에 저장되었다가 분석 후 자동으로 삭제됩니다.
- **화자 분리 정확도**: 오디오 품질, 배경 소음, 화자 간 음성 차이 등에 따라 달라질 수 있습니다.

## 트러블슈팅

### 1. API 인증 오류
- Daglo API 키가 올바르게 설정되었는지 확인
- API 키에 적절한 권한이 있는지 확인
- 환경 변수가 서버 재시작 후 적용되었는지 확인

### 2. 화자 분리 정확도 개선
- 더 깨끗한 오디오 사용 (배경 소음 최소화)
- 한 사람씩 번갈아 말하는 명확한 대화 녹음
- 16kHz 이상의 샘플링 레이트 사용 권장

### 3. 할당량 초과 오류
- Daglo Console에서 API 할당량 확인 및 증가
- Gemini API 사용량 확인 및 결제 계정 업그레이드
- Firebase Storage 할당량 확인

### 4. 오디오 파일 형식 문제
- 지원되는 형식인지 확인 (.mp3, .wav 권장)
- 파일 크기가 2GB 이하인지 확인
- 재생 시간이 4시간 이하인지 확인

## 커스터마이징

### 언어 변경
```javascript
// route.js에서 언어 설정 변경
const requestOptions = {
  // ...
  language: 'en', // 'ko', 'en', 'ja' 또는 'ko-en'
  // ...
};
```

### 화자 수 제한 조정
```javascript
const requestOptions = {
  // ...
  diarization: {
    enable: true,
    maxSpeakers: 6 // 최대 화자 수 조정
  },
  // ...
};
```

### UI 커스터마이징
- 화자 색상: `speakerColors` 객체 수정
- 컴포넌트 스타일: Tailwind CSS 클래스 수정
- 레이아웃: 각 컴포넌트 파일에서 수정

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 