import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCMfOKrEe89G6jnlW2A-TwDeKe8FS_K1uY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "conversation-analyzer-67e97.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "conversation-analyzer-67e97",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "conversation-analyzer-67e97.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "919686543413",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:919686543413:web:2efd0b1ec412a53906197c",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-31J910Q1ZF"
};

// App Router 설정
export const config = {
  runtime: 'edge',
};

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS 메서드 처리 함수 (CORS preflight 요청 처리)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// Firebase 초기화
let firebaseApp;
let firebaseStorage;
try {
  firebaseApp = initializeApp(firebaseConfig);
  firebaseStorage = getStorage(firebaseApp);
} catch (error) {
  console.error('Firebase 초기화 오류:', error);
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
        { status: 400, headers: corsHeaders }
      );
    }

    // 세션 초기화 성공 응답 반환
    return NextResponse.json({
      success: true,
      message: '파일 업로드 초기화 완료',
      sessionId
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('업로드 초기화 오류:', error);
    return NextResponse.json(
      { error: `업로드 초기화 실패: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
} 