/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 환경 변수 설정
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  // API 요청 크기 제한 늘리기
  api: {
    bodyParser: {
      sizeLimit: '50mb', // 최대 요청 크기를 50MB로 설정
    },
    responseLimit: false, // 응답 크기 제한 해제
  },
}

module.exports = nextConfig 