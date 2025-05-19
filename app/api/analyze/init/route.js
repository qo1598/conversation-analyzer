import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 임시 디렉토리 설정
const TMP_DIR = path.join(process.cwd(), 'tmp');
const CHUNK_DIR = path.join(TMP_DIR, 'chunks');

// App Router 설정
export const config = {
  runtime: 'nodejs',
  maxDuration: 10, // 최대 10초
};

// 디렉토리가 없으면 생성
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

if (!fs.existsSync(CHUNK_DIR)) {
  fs.mkdirSync(CHUNK_DIR, { recursive: true });
}

// POST 처리 함수
export async function POST(req) {
  try {
    // 요청 본문 파싱
    const body = await req.json();
    const { fileName, fileType, fileSize, totalChunks, sessionId } = body;

    if (!fileName || !sessionId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 세션별 디렉토리 생성
    const sessionDir = path.join(CHUNK_DIR, sessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // 세션 정보 저장
    const sessionInfo = {
      fileName,
      fileType,
      fileSize,
      totalChunks,
      sessionId,
      createdAt: new Date().toISOString(),
      chunks: Array(totalChunks).fill(false) // 각 청크의 업로드 상태 추적
    };

    fs.writeFileSync(
      path.join(sessionDir, 'info.json'),
      JSON.stringify(sessionInfo, null, 2)
    );

    return NextResponse.json({
      success: true,
      message: '파일 업로드 초기화 완료',
      sessionId
    });
  } catch (error) {
    console.error('업로드 초기화 오류:', error);
    return NextResponse.json(
      { error: `업로드 초기화 실패: ${error.message}` },
      { status: 500 }
    );
  }
} 