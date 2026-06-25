-- schema.sql

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone         VARCHAR(20),
  role          VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(255) NOT NULL,
  code              VARCHAR(50),
  mark_per_question DECIMAL(5,2) DEFAULT 1,
  duration          INT NOT NULL,
  start_time        TIMESTAMPTZ,
  end_time          TIMESTAMPTZ,
  status            BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id              SERIAL PRIMARY KEY,
  exam_id         INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  option_a        TEXT NOT NULL,
  option_b        TEXT NOT NULL,
  option_c        TEXT,
  option_d        TEXT,
  correct_option  CHAR(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exam_results (
  id            SERIAL PRIMARY KEY,
  exam_id       INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score         DECIMAL(10,2),
  total_marks   DECIMAL(10,2),
  percentage    DECIMAL(5,2),
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exam_id, user_id)
);

CREATE TABLE IF NOT EXISTS exam_answers (
  id              SERIAL PRIMARY KEY,
  result_id       INT NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  question_id     INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option CHAR(1) NOT NULL,
  is_correct      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(result_id, question_id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id              SERIAL PRIMARY KEY,
  session_number  VARCHAR(50),
  category        VARCHAR(100),
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  file_url        TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_result ON exam_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
