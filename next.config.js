/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 환경 변수 설정
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  // Next.js 13 이상에서는 app 라우터에 api 구성을 사용하지 않음
  // 대신 옵션으로 처리
}

module.exports = nextConfig 