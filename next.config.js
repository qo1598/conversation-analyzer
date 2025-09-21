/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 환경 변수 설정
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DAGLO_API_KEY: process.env.DAGLO_API_KEY
  },
  
  // Next.js 15.3.2에서 업데이트된 설정
  serverExternalPackages: ['@google-cloud/speech', 'formidable', 'firebase'],
  
  // 파일 추적 제외 설정 (루트 레벨로 이동)
  outputFileTracingExcludes: {
    '**/node_modules/firebase/**': ['*'],
    '**/node_modules/formidable/**': ['*']
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
  
  // 웹팩 설정 최적화
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Firebase 관련 모듈에 대한 예외 처리
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        punycode: false,
        process: false,
        querystring: false,
        util: false,
        buffer: false,
        events: false,
      };
    }
    
    return config;
  },
  // CORS 헤더 추가
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, apikey, x-client-info',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig 