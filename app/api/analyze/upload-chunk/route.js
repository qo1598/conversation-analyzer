import { NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

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

// OPTIONS 메서드 처리 함수
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

// 청크 업로드 API 비활성화
export async function POST(req) {
  console.log('청크 업로드 API는 더 이상 사용되지 않습니다. 새로운 업로드 방식을 사용하세요.');
  
  return NextResponse.json(
    { 
      error: '청크 업로드 API는 더 이상 사용되지 않습니다. 새로운 직접 업로드 방식을 사용하세요.' 
    },
    { status: 410, headers: corsHeaders }
  );
} 