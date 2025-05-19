# 대화 분석 시스템

이 프로젝트는 녹음된 대화 파일을 업로드하여 화자를 구분하고 텍스트로 변환한 후, 대화 내용을 분석하는 웹 애플리케이션입니다. 특히 한국어 음성 파일에 최적화되어 있습니다.

## 주요 기능

1. 오디오 파일 업로드 및 처리
2. 화자 분리(Speaker Diarization)
3. 음성-텍스트 변환(STT) - 한국어 최적화
4. 대화 내용 분석 및 평가
5. 시각적 결과 표시

## 기술 스택

- Next.js - 웹 프레임워크
- DAGLO API - 화자 분리 및 음성-텍스트 변환 (한국어 최적화)
- Google Gemini API - 대화 내용 분석
- Tailwind CSS - UI 디자인

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

3. API 키 설정:

### Google Gemini API 키 설정

1. [Google AI Studio](https://ai.google.dev/) 에서 API 키를 생성합니다.
2. `.env.local` 파일을 프로젝트 루트에 생성하고 다음과 같이 API 키를 추가합니다:
```
GEMINI_API_KEY=your_gemini_api_key
```

### DAGLO API 설정

1. [DAGLO 웹사이트](https://daglo.cc)에서 계정을 생성합니다.
2. API 키 섹션에서 새 API 키를 생성합니다.
3. `.env.local` 파일에 DAGLO API 키를 추가합니다:
```
DAGLO_API_KEY=your_daglo_api_key
```
4. 또는 `route.js` 파일의 `DAGLO_API_KEY` 변수에 직접 추가할 수 있습니다.

## 한국어 음성 파일 최적화

이 시스템은 한국어 대화 녹음 파일에 최적화되어 있습니다:

1. DAGLO API의 한국어 언어 모델을 사용
2. 화자 분리(Speaker Diarization) 기능으로 여러 화자를 자동으로 구분
3. 고품질 음성 인식 정확도
4. 한국어 음성 인식에 최적화된 구성 사용

## 로컬에서 실행하기

개발 서버 시작:
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하여 애플리케이션을 확인합니다.

## 배포

Next.js 애플리케이션은 Vercel 또는 다른 Next.js 호스팅 서비스에 쉽게 배포할 수 있습니다:

```bash
npm run build
```

배포 시 다음 사항에 주의하세요:
- 환경 변수(API 키 등)를 호스팅 서비스에 설정
- API 사용량 및 비용 모니터링

## 주의사항

- DAGLO API 및 Gemini API는 사용량에 따라 비용이 발생할 수 있습니다.
- 오디오 파일은 임시적으로 서버에 저장되었다가 분석 후 자동으로 삭제됩니다.
- 화자 분리 정확도는 오디오 품질, 배경 소음, 화자 간 음성 차이 등에 따라 달라질 수 있습니다.

## 트러블슈팅

1. "인증 오류"가 발생하는 경우:
   - DAGLO API 키가 올바르게 설정되었는지 확인하세요.
   - API 키에 적절한 권한이 있는지 확인하세요.

2. 화자 분리가 정확하지 않은 경우:
   - 더 깨끗한 오디오를 사용해보세요.
   - 한 사람씩 번갈아 말하는 명확한 대화 녹음을 사용하세요.
   - 배경 소음이 적은 환경에서 녹음하세요.

3. "할당량 초과" 오류가 발생하는 경우:
   - DAGLO 콘솔에서 API 할당량을 확인하고 필요하면 증가시키세요.
   - Gemini API 사용량을 확인하고 필요하면 결제 계정으로 업그레이드하세요.

4. 오디오 파일 형식 문제:
   - WAV 또는 MP3 형식의 오디오 파일을 사용하세요.
   - 필요한 경우 오디오 파일을 변환하세요.

## 커스터마이징

- DAGLO API 요청에서 `language` 파라미터를 변경하여 다른 언어를 사용할 수 있습니다 (예: 'en' for English, 'ja' for Japanese).
- 오디오 파일 처리 방식을 변경하려면 `processSpeechToText` 함수를 수정하세요.
- 화자 색상 또는 UI를 변경하려면 해당 컴포넌트 파일을 수정하세요. 