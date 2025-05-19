/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 환경 변수 설정
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  // Next.js 13 이상에서는 app 라우터에 api 구성을 사용하지 않음
  // 대신 옵션으로 처리
  
  // Vercel에서 큰 파일 업로드를 위한 설정
  experimental: {
    // 다른 실험적 옵션들
  },
  
  // Next.js 15.3.2에서 업데이트된 설정
  serverExternalPackages: ['formidable', 'firebase'],
  
  // 파일 추적 제외 설정 (루트 레벨로 이동)
  outputFileTracingExcludes: {
    '**/node_modules/firebase/**': ['*'],
    '**/node_modules/formidable/**': ['*']
  },
  
  // API 요청 크기 제한 늘리기를 위한 Vercel 설정
  serverRuntimeConfig: {
    api: {
      bodyParser: {
        sizeLimit: '100mb'
      }
    }
  },
  
  // Firebase Storage URL에 대한 CORS 이슈 해결을 위한 이미지 설정
  images: {
    domains: ['firebasestorage.googleapis.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '**',
      },
    ],
  },
}

module.exports = nextConfig 