-- Thrives Archivers Quiz System Database Schema
-- Run these queries in your Supabase SQL editor

-- ============================================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  year_level VARCHAR(50),
  total_score INTEGER DEFAULT 0,
  quizzes_completed INTEGER DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- QUIZZES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject VARCHAR(100) NOT NULL,
  description TEXT,
  total_questions INTEGER NOT NULL,
  time_limit_minutes INTEGER DEFAULT 30,
  difficulty VARCHAR(20) DEFAULT 'Medium',
  passing_score INTEGER DEFAULT 70,
  created_by UUID REFERENCES public.users(id),
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- QUESTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type VARCHAR(20) DEFAULT 'multiple_choice',
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- OPTIONS TABLE (for multiple choice questions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- QUIZ ATTEMPTS TABLE (user submissions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  score INTEGER,
  total_questions INTEGER,
  correct_answers INTEGER,
  passed BOOLEAN,
  time_taken_seconds INTEGER,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- USER ANSWERS TABLE (tracks individual answers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_id UUID REFERENCES public.options(id),
  is_correct BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- LEADERBOARD TABLE (for performance tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  quizzes_taken INTEGER DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  rank_position INTEGER,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile and public profiles
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Everyone can view published quizzes
CREATE POLICY "Anyone can view published quizzes" ON public.quizzes
  FOR SELECT USING (is_published = TRUE);

-- Users can view questions in published quizzes
CREATE POLICY "View questions of published quizzes" ON public.questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_id AND q.is_published = TRUE)
  );

-- Users can only view their own attempts
CREATE POLICY "Users can view own attempts" ON public.quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own attempts
CREATE POLICY "Users can create attempts" ON public.quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can view their own answers
CREATE POLICY "Users can view own answers" ON public.user_answers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.quiz_attempts qa WHERE qa.id = quiz_attempt_id AND qa.user_id = auth.uid())
  );

-- Everyone can view leaderboard (public rankings)
CREATE POLICY "Anyone can view leaderboard" ON public.leaderboard
  FOR SELECT USING (true);

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================
CREATE INDEX idx_quiz_attempts_user_id ON public.quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts(quiz_id);
CREATE INDEX idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX idx_options_question_id ON public.options(question_id);
CREATE INDEX idx_leaderboard_rank ON public.leaderboard(rank_position);
