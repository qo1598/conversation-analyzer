import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import axios from 'axios'

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgxbtjxxqjmgemtoyauh.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_SERVICE_KEY_HERE'

// Service role key를 사용한 Supabase 클라이언트
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// API 키 환경 변수에서 가져오기
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyBr3C6s-vWZR9LfI_Kc72jLQsI3bemd-Fk";
const DAGLO_API_KEY = process.env.DAGLO_API_KEY || "LL9h2BxPTGGvjnj5zq4kDmo7";

// OPTIONS 메서드 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// GET 요청 처리 - RID로 결과 확인
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const rid = searchParams.get('rid');
    const filePath = searchParams.get('filePath');
    
    if (!rid) {
      return NextResponse.json(
        { error: 'RID가 제공되지 않았습니다' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    console.log('=== 분석 상태 확인 ===');
    console.log('RID:', rid);
    console.log('FilePath:', filePath);
    
    // Daglo API 결과 확인
    const apiUrl = 'https://apis.daglo.ai/stt/v1/async/transcripts';
    const resultResponse = await axios.get(`${apiUrl}/${rid}`, {
      headers: {
        'Authorization': `Bearer ${DAGLO_API_KEY}`
      }
    });
    
    console.log('Daglo API 상태:', resultResponse.data.status);
    
    if (resultResponse.data.status === 'transcribed') {
      console.log('트랜스크립션 완료, 분석 시작...');
      
      // Daglo 결과 변환
      const transcript = convertDagloResults(resultResponse.data);
      
      // Gemini API를 사용한 대화 분석
      const analysisResult = await analyzeConversation(transcript.transcript, transcript.speakers);
      
      // 임시 파일 삭제
      if (filePath) {
        try {
          await supabase.storage
            .from('recordings')
            .remove([filePath]);
          console.log('임시 파일 삭제 완료');
        } catch (deleteError) {
          console.error('임시 파일 삭제 오류:', deleteError);
        }
      }
      
      return NextResponse.json({
        status: 'completed',
        transcript: transcript.transcript,
        speakers: transcript.speakers,
        analysis: analysisResult,
      }, { headers: corsHeaders });
      
    } else if (resultResponse.data.status === 'transcript_error' || resultResponse.data.status === 'file_error') {
      // 오류 시 임시 파일 삭제
      if (filePath) {
        try {
          await supabase.storage
            .from('recordings')
            .remove([filePath]);
          console.log('오류 시 임시 파일 삭제 완료');
        } catch (deleteError) {
          console.error('오류 시 임시 파일 삭제 실패:', deleteError);
        }
      }
      
      return NextResponse.json({
        status: 'error',
        error: `Daglo API 오류: ${resultResponse.data.status}`
      }, { status: 500, headers: corsHeaders });
      
    } else {
      // 아직 처리 중
      return NextResponse.json({
        status: 'processing',
        message: `처리 중... (${resultResponse.data.status})`
      }, { headers: corsHeaders });
    }
    
  } catch (error) {
    console.error('분석 상태 확인 오류:', error);
    return NextResponse.json(
      { error: `분석 상태 확인 중 오류가 발생했습니다: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

// TODO: 여기에 convertDagloResults와 analyzeConversation 함수들을 복사해야 함 