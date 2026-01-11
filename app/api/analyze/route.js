import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processSpeechWithDaglo, submitToDagloAPI } from '@/lib/daglo'
import { analyzeConversation } from '@/lib/gemini'

export const runtime = 'nodejs'
export const maxDuration = 60

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hgxbtjxxqjmgemtoyauh.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneGJ0anh4cWptZ2VtdG95YXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3NjcxMTMsImV4cCI6MjA1MjM0MzExM30.3cJBpIzJqBBrfzxQNKGJJQWjPKzFbGRiKuWKfVEqDqk'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      return await handleFormDataRequest(req);
    }

    return await handleJsonRequest(req); // 오디오 URL 처리

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// 1. FormData 요청 (즉시 분석)
async function handleFormDataRequest(req) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile) throw new Error('오디오 파일 필요');

    // Supabase에 임시 업로드
    const fileBuffer = await audioFile.arrayBuffer();
    const fileName = `temp_${Date.now()}_${audioFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(`temp/${fileName}`, fileBuffer, { contentType: audioFile.type });

    if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from('recordings')
      .getPublicUrl(uploadData.path);

    // 분석 실행
    const transcript = await processSpeechWithDaglo(publicUrl);
    const analysisResult = await analyzeConversation(transcript.transcript, transcript.speakers);

    // 정리
    await supabase.storage.from('recordings').remove([uploadData.path]);

    return NextResponse.json({
      transcript: transcript.transcript,
      speakers: transcript.speakers,
      analysis: analysisResult,
    }, { headers: corsHeaders });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// 2. JSON 요청 (비동기 처리)
async function handleJsonRequest(req) {
  try {
    const { audioUrl, filePath } = await req.json();
    if (!audioUrl) throw new Error('audioUrl 필요');

    // URL 접근 테스트
    const test = await fetch(audioUrl, { method: 'HEAD' });
    if (!test.ok) throw new Error('오디오 파일 접근 불가');

    // Daglo 비동기 요청 시작
    const rid = await submitToDagloAPI(audioUrl);

    return NextResponse.json({
      status: 'processing',
      rid: rid,
      filePath: filePath,
      message: '분석 시작됨'
    }, { headers: corsHeaders });

  } catch (error) {
    // 에러 시 임시 파일 정리
    const reqJson = await req.json().catch(() => ({}));
    if (reqJson.filePath) {
      await supabase.storage.from('recordings').remove([reqJson.filePath]);
    }
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}