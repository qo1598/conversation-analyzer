# 🚀 Supabase 설정 가이드

이 문서는 대화 분석 시스템을 Supabase와 연동하여 프로덕션 환경에서 실행하기 위한 설정 가이드입니다.

## 📋 준비사항

1. [Supabase 계정](https://supabase.com) 생성
2. Node.js 18+ 설치
3. Git 설치

## 🎯 1단계: Supabase 프로젝트 생성

1. **Supabase 대시보드에 로그인**
   - https://supabase.com/dashboard 접속
   - "New project" 클릭

2. **프로젝트 설정**
   - Organization 선택
   - Name: `conversation-analyzer`
   - Database Password: 강력한 비밀번호 설정
   - Region: `Northeast Asia (Seoul)` 선택 (한국 서비스라면)

3. **프로젝트 생성 완료까지 대기** (약 2분)

## 🗄️ 2단계: 데이터베이스 스키마 설정

1. **SQL Editor 열기**
   - Supabase 대시보드에서 좌측 메뉴 "SQL Editor" 클릭

2. **스키마 실행**
   - 프로젝트 루트의 `supabase-schema.sql` 파일 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭

3. **테이블 확인**
   - 좌측 메뉴 "Database" → "Tables"에서 생성된 테이블 확인:
     - `teachers` (교사 정보)
     - `sessions` (세션 정보)  
     - `recordings` (녹음 기록)

## 📁 3단계: Storage 설정

1. **Storage 버킷 생성**
   - 좌측 메뉴 "Storage" 클릭
   - "Create bucket" 클릭
   - Name: `recordings`
   - Public bucket: **체크 해제** (보안상 비공개)

2. **Storage 정책 설정**
   ```sql
   -- Storage 정책 (SQL Editor에서 실행)
   
   -- 업로드 권한: 모든 사용자 (학생 업로드용)
   INSERT INTO storage.policies (bucket_id, name, definition, check)
   VALUES (
     'recordings',
     'Allow uploads to recordings bucket',
     'bucket_id = ''recordings''',
     'bucket_id = ''recordings'''
   );
   
   -- 다운로드 권한: 인증된 사용자만 (교사용)
   INSERT INTO storage.policies (bucket_id, name, definition, check)
   VALUES (
     'recordings',
     'Allow authenticated downloads from recordings bucket',
     'bucket_id = ''recordings'' AND auth.role() = ''authenticated''',
     'bucket_id = ''recordings'' AND auth.role() = ''authenticated'''
   );
   ```

## 🔑 4단계: API 키 확보

1. **Project Settings 접속**
   - 좌측 메뉴 하단 "Settings" → "API" 클릭

2. **필요한 키 복사**
   - `URL`: Project URL 복사
   - `anon public`: anon/public key 복사

## 🌍 5단계: 환경변수 설정

1. **로컬 개발환경**
   ```bash
   # .env.local 파일 생성
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # 기존 AI API 키들
   GEMINI_API_KEY=your_gemini_api_key
   DAGLO_API_KEY=your_daglo_api_key
   ```

2. **Vercel 배포환경**
   - Vercel 대시보드에서 Environment Variables에 위 키들 추가

## 📦 6단계: 패키지 설치

```bash
npm install @supabase/supabase-js@^2.45.4
```

## 🧪 7단계: 테스트

1. **개발 서버 실행**
   ```bash
   npm run dev
   ```

2. **기능 테스트**
   - 교사 회원가입/로그인
   - 세션 생성
   - 학생 세션 참여
   - 녹음 업로드
   - 분석 결과 확인

## 🚀 8단계: Vercel 배포

1. **GitHub에 코드 푸시**
   ```bash
   git add .
   git commit -m "Add Supabase integration"
   git push origin main
   ```

2. **Vercel 연동**
   - Vercel 대시보드에서 GitHub 레포지토리 import
   - Environment Variables 설정
   - 배포 완료

## 🔧 주요 차이점 (LocalStorage → Supabase)

| 기능 | 이전 (LocalStorage) | 이후 (Supabase) |
|------|---------------------|------------------|
| **데이터 지속성** | 브라우저별 로컬 저장 | 클라우드 영구 저장 |
| **교사 인증** | 가짜 로그인 | 실제 계정 시스템 |
| **세션 공유** | 불가능 | 실시간 공유 가능 |
| **파일 저장** | 임시 Firebase | Supabase Storage |
| **확장성** | 제한적 | 무제한 확장 |
| **보안** | 없음 | RLS 보안 정책 |

## ⚠️ 주의사항

1. **API 사용량 모니터링**
   - Supabase 무료 플랜 한도 확인
   - 필요시 Pro 플랜 업그레이드

2. **보안 설정**
   - RLS 정책 반드시 활성화
   - 환경변수 노출 방지

3. **백업**
   - 정기적인 데이터베이스 백업 설정
   - Storage 파일 백업 계획

## 🆘 문제해결

### 자주 발생하는 오류

1. **"Invalid API key"**
   - 환경변수 설정 확인
   - Supabase 대시보드에서 키 재확인

2. **"Row Level Security policy"**
   - RLS 정책 올바른 설정 확인
   - SQL Editor에서 스키마 재실행

3. **"Storage upload failed"**
   - Storage 버킷 생성 확인
   - Storage 정책 설정 확인

### 지원

문제가 해결되지 않으면:
- Supabase 공식 문서: https://supabase.com/docs
- Discord 커뮤니티: https://discord.supabase.com

---

✨ **축하합니다!** 이제 완전한 클라우드 기반 대화 분석 시스템을 운영할 수 있습니다! 