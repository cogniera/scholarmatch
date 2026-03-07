-- =========================================
-- ScholarMatch Database Schema (Supabase)
-- Run this in Supabase SQL Editor
-- =========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,           -- Matches Auth0 sub (user ID)
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  gpa FLOAT CHECK (gpa >= 0 AND gpa <= 4.0),
  program TEXT,
  location TEXT,
  academic_level TEXT CHECK (academic_level IN ('High School', 'Undergraduate', 'Graduate', 'PhD')),
  financial_need BOOLEAN DEFAULT FALSE,
  extracurriculars TEXT,
  resume_url TEXT,
  transcript_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scholarships table
CREATE TABLE IF NOT EXISTS scholarships (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  provider TEXT,
  amount INTEGER,
  deadline DATE,
  eligibility TEXT,
  location TEXT,
  program TEXT,                  -- Comma-separated programs e.g. "Computer Science,Engineering"
  gpa_requirement FLOAT DEFAULT 0.0,
  financial_need_required BOOLEAN DEFAULT FALSE,
  academic_level TEXT,           -- Comma-separated levels
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches table (cached results)
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scholarship_id INTEGER REFERENCES scholarships(id) ON DELETE CASCADE,
  match_score FLOAT,
  ai_explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, scholarship_id)
);

-- Seed some sample scholarships for demo
INSERT INTO scholarships (title, provider, amount, deadline, eligibility, location, program, gpa_requirement, financial_need_required, academic_level, link)
VALUES
  ('STEM Future Grant', 'Ontario Government', 5000, '2026-06-01', 'Students in STEM programs with GPA above 3.5', 'Ontario', 'Computer Science,Engineering,Mathematics', 3.5, FALSE, 'Undergraduate', 'https://example.com/stem-future'),
  ('Women in Technology Scholarship', 'TechForward Foundation', 3000, '2026-05-15', 'Women pursuing technology degrees', 'Canada', 'Computer Science,Software Engineering,Data Science', 3.0, FALSE, 'Undergraduate,Graduate', 'https://example.com/women-tech'),
  ('First Generation University Bursary', 'Canadian Bursary Council', 2500, '2026-04-30', 'First generation university students with financial need', 'Canada', 'All', 0.0, TRUE, 'Undergraduate', 'https://example.com/first-gen'),
  ('Indigenous STEM Award', 'Reconciliation in Education Fund', 4000, '2026-07-01', 'Indigenous students in STEM fields', 'Canada', 'Computer Science,Engineering,Science', 2.5, FALSE, 'Undergraduate,Graduate', 'https://example.com/indigenous-stem'),
  ('Community Leadership Scholarship', 'National Leadership Foundation', 2000, '2026-05-01', 'Students with demonstrated community involvement', 'Canada', 'All', 2.8, FALSE, 'Undergraduate', 'https://example.com/community-leadership'),
  ('Financial Need Bursary - University of Toronto', 'University of Toronto', 6000, '2026-03-31', 'Students with demonstrated financial need', 'Ontario', 'All', 0.0, TRUE, 'Undergraduate,Graduate', 'https://example.com/uoft-bursary'),
  ('Graduate Excellence Award', 'Canadian Research Council', 10000, '2026-08-01', 'Graduate students with outstanding academic achievement', 'Canada', 'All', 3.7, FALSE, 'Graduate,PhD', 'https://example.com/grad-excellence'),
  ('New Canadian Scholarship', 'Newcomers Foundation', 3500, '2026-06-15', 'Recent immigrants pursuing post-secondary education', 'Canada', 'All', 2.5, TRUE, 'Undergraduate', 'https://example.com/new-canadian');
