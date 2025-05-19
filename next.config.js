/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 환경 변수 설정
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
}

module.exports = nextConfig 