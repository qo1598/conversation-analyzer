import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 최대 파일 크기 제한 (100MB)
const MAX_SIZE = 100 * 1024 * 1024;

export function middleware(request: NextRequest) {
  // API 요청에 대해서만 처리
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // CORS 헤더 추가
    const response = NextResponse.next();
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // OPTIONS 요청에 대한 처리 (preflight)
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { 
        status: 204,
        headers: response.headers
      });
    }
    
    // 파일 크기 제한 확인
    const contentLength = request.headers.get('content-length');
    
    // 요청 크기가 제한을 초과하는 경우
    if (contentLength && parseInt(contentLength) > MAX_SIZE) {
      return NextResponse.json(
        { 
          error: `파일 크기가 너무 큽니다. 최대 100MB까지 업로드 가능합니다. (현재: ${Math.round(parseInt(contentLength) / 1024 / 1024 * 100) / 100}MB)` 
        },
        { 
          status: 413,
          headers: response.headers
        }
      );
    }
    
    return response;
  }

  // 다른 요청은 그대로 처리
  return NextResponse.next();
}

// 미들웨어를 적용할 경로 설정
export const config = {
  matcher: [
    '/api/:path*',
  ],
}; 