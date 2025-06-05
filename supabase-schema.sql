-- 교사 테이블
CREATE TABLE teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  password_hash VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 세션 테이블
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  code VARCHAR(6) UNIQUE NOT NULL,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 녹음 테이블
CREATE TABLE recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  file_path VARCHAR NOT NULL,
  file_size INTEGER,
  duration INTEGER,
  transcript JSONB,
  speakers JSONB,
  analysis JSONB,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_sessions_teacher_id ON sessions(teacher_id);
CREATE INDEX idx_sessions_code ON sessions(code);
CREATE INDEX idx_recordings_session_id ON recordings(session_id);

-- RLS (Row Level Security) 정책 활성화
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- RLS 정책 설정
-- 교사는 자신의 데이터만 접근 가능
CREATE POLICY "Teachers can view own data" ON teachers
  FOR ALL USING (auth.uid() = id);

-- 교사는 자신의 세션만 관리 가능
CREATE POLICY "Teachers can manage own sessions" ON sessions
  FOR ALL USING (teacher_id = auth.uid());

-- 세션 코드로 세션 정보 조회 (학생 접근용)
CREATE POLICY "Anyone can view session by code" ON sessions
  FOR SELECT USING (true);

-- 교사는 자신 세션의 녹음만 접근, 학생은 세션 코드로 업로드 가능
CREATE POLICY "Manage recordings by session ownership" ON recordings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = recordings.session_id 
      AND (sessions.teacher_id = auth.uid() OR auth.role() = 'anon')
    )
  );

-- 함수: 세션 코드 생성
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  new_code VARCHAR(6);
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- 6자리 숫자 코드 생성
    new_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- 중복 확인
    SELECT EXISTS(SELECT 1 FROM sessions WHERE code = new_code) INTO code_exists;
    
    -- 중복이 없으면 반환
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 트리거: sessions 테이블에 새 레코드 삽입 시 자동으로 코드 생성
CREATE OR REPLACE FUNCTION set_session_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := generate_session_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_session_code
  BEFORE INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_session_code();

-- 트리거: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_teachers_updated_at
  BEFORE UPDATE ON teachers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 