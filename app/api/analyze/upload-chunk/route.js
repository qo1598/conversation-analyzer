import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// 임시 디렉토리 설정
const TMP_DIR = path.join(process.cwd(), 'tmp');
const CHUNK_DIR = path.join(TMP_DIR, 'chunks');

// App Router 설정
export const config = {
  runtime: 'nodejs',
  maxDuration: 30, // 최대 30초
};

// POST 처리 함수
export async function POST(req) {
  try {
    // 요청 본문 파싱 (multipart/form-data)
    const formData = await req.formData();
    const chunk = formData.get('chunk');
    const sessionId = formData.get('sessionId');
    const chunkIndex = formData.get('chunkIndex');
    const totalChunks = formData.get('totalChunks');

    if (!chunk || !sessionId || chunkIndex === undefined) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 세션 디렉토리 경로
    const sessionDir = path.join(CHUNK_DIR, sessionId);
    
    // 세션 디렉토리가 없으면 오류
    if (!fs.existsSync(sessionDir)) {
      return NextResponse.json(
        { error: '유효하지 않은 세션입니다. 먼저 업로드를 초기화해주세요.' },
        { status: 400 }
      );
    }

    // 세션 정보 읽기
    const infoPath = path.join(sessionDir, 'info.json');
    if (!fs.existsSync(infoPath)) {
      return NextResponse.json(
        { error: '세션 정보를 찾을 수 없습니다.' },
        { status: 400 }
      );
    }

    const sessionInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    
    // 청크 인덱스 검증
    const chunkIndexNum = parseInt(chunkIndex);
    if (isNaN(chunkIndexNum) || chunkIndexNum < 0 || chunkIndexNum >= sessionInfo.totalChunks) {
      return NextResponse.json(
        { error: '유효하지 않은 청크 인덱스입니다.' },
        { status: 400 }
      );
    }

    // 청크 파일 저장
    const chunkPath = path.join(sessionDir, `chunk-${chunkIndexNum}`);
    const fileBuffer = Buffer.from(await chunk.arrayBuffer());
    fs.writeFileSync(chunkPath, fileBuffer);

    // 청크 업로드 상태 업데이트
    sessionInfo.chunks[chunkIndexNum] = true;
    fs.writeFileSync(infoPath, JSON.stringify(sessionInfo, null, 2));

    // 모든 청크가 업로드되었는지 확인
    const allChunksUploaded = sessionInfo.chunks.every(chunk => chunk === true);

    return NextResponse.json({
      success: true,
      message: `청크 ${chunkIndexNum + 1}/${totalChunks} 업로드 완료`,
      chunkIndex: chunkIndexNum,
      complete: allChunksUploaded
    });
  } catch (error) {
    console.error('청크 업로드 오류:', error);
    return NextResponse.json(
      { error: `청크 업로드 실패: ${error.message}` },
      { status: 500 }
    );
  }
} 