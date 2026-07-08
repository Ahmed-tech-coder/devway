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
  max_violations    INT DEFAULT 3,
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
  id               SERIAL PRIMARY KEY,
  exam_id          INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score            DECIMAL(10,2),
  total_marks      DECIMAL(10,2),
  percentage       DECIMAL(5,2),
  violations_count INT DEFAULT 0,
  violations_log   JSONB DEFAULT '[]'::jsonb,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
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
  links           JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_user ON exam_results(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_result ON exam_answers(result_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- =========================================================================
-- ASSIGNMENT MANAGEMENT SYSTEM SCHEMA ADDITION
-- =========================================================================

-- 1. Assignment Templates Table
CREATE TABLE IF NOT EXISTS assignment_templates (
  id                    SERIAL PRIMARY KEY,
  title                 VARCHAR(255) NOT NULL,
  description           TEXT,
  instructions          TEXT,
  objectives            TEXT,
  resources             JSONB DEFAULT '[]'::jsonb,
  rubrics               JSONB DEFAULT '[]'::jsonb,
  allow_text            BOOLEAN DEFAULT true,
  allow_file            BOOLEAN DEFAULT true,
  allowed_extensions    TEXT, -- e.g., "pdf,docx,png,jpg,jpeg,zip"
  max_upload_size       INT DEFAULT 10, -- in MB
  max_attempts          INT DEFAULT 1,
  default_grade         DECIMAL(10,2) DEFAULT 100.00,
  default_duration_days INT DEFAULT 7,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Assignment Template Files Table
CREATE TABLE IF NOT EXISTS assignment_template_files (
  id            SERIAL PRIMARY KEY,
  template_id   INT NOT NULL REFERENCES assignment_templates(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100),
  extension     VARCHAR(20),
  size          INT,
  url           TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Assignments Table
CREATE TABLE IF NOT EXISTS assignments (
  id                    SERIAL PRIMARY KEY,
  title                 VARCHAR(255) NOT NULL,
  description           TEXT,
  instructions          TEXT,
  objectives            TEXT,
  resources             JSONB DEFAULT '[]'::jsonb,
  max_grade             DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  deadline              TIMESTAMPTZ NOT NULL,
  due_time              VARCHAR(10),
  publish_date          TIMESTAMPTZ,
  allow_late_submission BOOLEAN DEFAULT false,
  max_attempts          INT DEFAULT 1,
  allow_text            BOOLEAN DEFAULT true,
  allow_file            BOOLEAN DEFAULT true,
  allowed_extensions    TEXT, -- e.g. "pdf,docx,png,jpg,jpeg,zip"
  max_upload_size       INT DEFAULT 10, -- in MB
  status                VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'closed', 'archived')),
  rubrics               JSONB DEFAULT '[]'::jsonb,
  max_violations        INT DEFAULT 3,
  version               INT DEFAULT 1,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  template_id           INT REFERENCES assignment_templates(id) ON DELETE SET NULL,
  deleted_at            TIMESTAMPTZ DEFAULT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Assignment Files Table
CREATE TABLE IF NOT EXISTS assignment_files (
  id            SERIAL PRIMARY KEY,
  assignment_id INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100),
  extension     VARCHAR(20),
  size          INT,
  url           TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Submissions Table
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id               SERIAL PRIMARY KEY,
  assignment_id    INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status           VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'late', 'under_review', 'returned', 'graded')),
  grade            DECIMAL(10,2) DEFAULT NULL,
  feedback         TEXT,
  violations_count INT DEFAULT 0,
  violations_log   JSONB DEFAULT '[]'::jsonb,
  graded_at        TIMESTAMPTZ DEFAULT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, user_id)
);

-- 6. Submission Attempts Table
CREATE TABLE IF NOT EXISTS assignment_submission_attempts (
  id             SERIAL PRIMARY KEY,
  submission_id  INT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  text_answer    TEXT,
  status         VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'late')),
  submitted_at   TIMESTAMPTZ DEFAULT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, attempt_number)
);

-- 7. Submission Files Table
CREATE TABLE IF NOT EXISTS assignment_submission_files (
  id            SERIAL PRIMARY KEY,
  attempt_id    INT NOT NULL REFERENCES assignment_submission_attempts(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100),
  extension     VARCHAR(20),
  size          INT,
  url           TEXT NOT NULL,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Threaded Discussion Comments Table
CREATE TABLE IF NOT EXISTS assignment_comments (
  id                SERIAL PRIMARY KEY,
  submission_id     INT NOT NULL REFERENCES assignment_submissions(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text              TEXT NOT NULL,
  parent_comment_id INT REFERENCES assignment_comments(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Assignment Versions Table
CREATE TABLE IF NOT EXISTS assignment_versions (
  id             SERIAL PRIMARY KEY,
  assignment_id  INT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  changed_fields JSONB NOT NULL,
  editor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id           SERIAL PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  message      TEXT NOT NULL,
  type         VARCHAR(50) NOT NULL,
  reference_id INT,
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for optimal querying performance
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_deleted ON assignments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_assignment_files_assign ON assignment_files(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assign ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON assignment_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submission_attempts_sub ON assignment_submission_attempts(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_files_attempt ON assignment_submission_files(attempt_id);
CREATE INDEX IF NOT EXISTS idx_comments_submission ON assignment_comments(submission_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

