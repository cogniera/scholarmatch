-- Supabase schema extensions for ScholarMatch recommendation pipeline
-- This file is meant to be run in the Supabase SQL editor or via the Supabase CLI.
-- It is idempotent where possible (uses IF NOT EXISTS) so it can be applied safely.

-- Enable pgvector for semantic embeddings (if not already enabled)
create extension if not exists vector;

-- ============================================================================
-- 1) Scholarships table extensions
-- ============================================================================

alter table public.scholarships
    add column if not exists min_gpa double precision,
    add column if not exists max_gpa double precision,
    add column if not exists eligible_academic_levels text[],
    add column if not exists eligible_programs text[],
    add column if not exists eligible_locations text[],
    add column if not exists demographic_requirements jsonb,
    add column if not exists is_need_based boolean,
    add column if not exists qualities_required text,
    -- Embedding over `qualities_required` and key eligibility narrative.
    -- We standardize on 768 dimensions (compatible with common Google text
    -- embedding configurations, for example gemini-embedding-001 with
    -- output_dimensionality=768).
    add column if not exists qualities_embedding vector(768);

-- Backfill is_need_based from existing financial_need_required flag when present.
update public.scholarships
set is_need_based = financial_need_required
where is_need_based is null
  and financial_need_required is not null;


-- ============================================================================
-- 2) Users table extensions
-- ============================================================================

alter table public.users
    add column if not exists demographics jsonb,
    add column if not exists career_interests text,
    add column if not exists profile_summary text,
    -- Embedding over extracurriculars + career_interests + profile_summary.
    add column if not exists qualities_embedding vector(768);


-- ============================================================================
-- 3) Matches table extensions
-- ============================================================================

alter table public.matches
    add column if not exists eligibility_pass boolean,
    add column if not exists eligibility_reason text,
    add column if not exists score_components jsonb,
    add column if not exists embedding_score double precision,
    add column if not exists ai_rank integer,
    add column if not exists run_id uuid,
    add column if not exists overall_recommendation text,
    add column if not exists next_steps jsonb;

create index if not exists idx_matches_user_run
    on public.matches (user_id, run_id);

-- Unique constraint for upsert: one match row per (user_id, scholarship_id, run_id)
create unique index if not exists idx_matches_user_scholarship_run
    on public.matches (user_id, scholarship_id, run_id);


-- ============================================================================
-- 4) Match runs table
-- ============================================================================

create table if not exists public.match_runs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    created_at timestamptz not null default now(),
    status text not null default 'running',
    config jsonb
);

create index if not exists idx_match_runs_user_created_at
    on public.match_runs (user_id, created_at desc);

