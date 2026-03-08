"""
routers/scholarships.py — Scholarship browsing + matching endpoints
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.auth import get_user_id
from app.database.database import get_supabase
from app.services.matching import match_scholarships
from app.services.gemini import explain_match_full, readiness_score
from typing import List, Optional

router = APIRouter(prefix="/scholarships", tags=["Scholarships"])


@router.get("")
def list_scholarships(
    location: Optional[str] = Query(None),
    program: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
):
    """List all scholarships with optional filters (public — no auth needed)."""
    db = get_supabase()
    query = db.table("scholarships").select("*").limit(limit)

    if location:
        query = query.ilike("location", f"%{location}%")
    if program:
        query = query.ilike("program", f"%{program}%")

    result = query.execute()
    return result.data


@router.get("/match")
def get_matches(
    explain: bool = Query(False, description="Run AI compare/judge/next-steps on top 10 (slower)"),
    top_n: int = Query(10, ge=1, le=10, description="Number of top matches for AI enrichment"),
    user_id: str = Depends(get_user_id),
):
    """
    Return scholarships matched to the current student's profile.
    Uses full pipeline: eligibility filter, points-based + embedding scoring.
    Set ?explain=true to run AI loop on top matches (adds ~2-3 sec per match).
    """
    db = get_supabase()

    user_result = db.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Profile not found. Create your profile first.")
    user = user_result.data[0]

    scholarships = db.table("scholarships").select("*").execute().data

    matches = match_scholarships(user, scholarships, top_n=50)

    run_id = str(uuid.uuid4())
    try:
        db.table("match_runs").insert({
            "id": run_id,
            "user_id": user_id,
            "status": "running",
            "config": {},
        }).execute()
    except Exception:
        pass  # match_runs table may not exist yet

    rows_for_upsert = []
    for rank, m in enumerate(matches, start=1):
        row = {
            "user_id": user_id,
            "scholarship_id": m["scholarship"]["id"],
            "match_score": m["match_score"],
            "eligibility_pass": m.get("eligibility_pass", True),
            "eligibility_reason": m.get("eligibility_reason"),
            "score_components": m.get("score_components"),
            "embedding_score": m.get("embedding_score"),
            "run_id": run_id,
            "ai_rank": rank if explain and rank <= top_n else None,
        }
        rows_for_upsert.append(row)

    for m, row in zip(matches, rows_for_upsert):
        if explain and m.get("ai_explanation") is None and row["ai_rank"] is not None:
            try:
                result = explain_match_full(
                    user,
                    m["scholarship"],
                    m.get("match_reasons", []),
                )
                m["ai_explanation"] = result.get("ai_explanation", "")
                m["next_steps"] = result.get("next_steps", [])
                m["overall_recommendation"] = result.get("overall_recommendation", "medium")
                row["ai_explanation"] = m["ai_explanation"]
                row["overall_recommendation"] = m["overall_recommendation"]
                row["next_steps"] = m["next_steps"]
            except Exception:
                m["ai_explanation"] = "Unable to generate explanation at this time."
                m["next_steps"] = []
                m["overall_recommendation"] = "medium"

        try:
            db.table("matches").insert(row).execute()
        except Exception:
            pass

    try:
        db.table("match_runs").update({"status": "completed"}).eq("id", run_id).execute()
    except Exception:
        pass

    return {
        "run_id": run_id,
        "total": len(matches),
        "matches": matches,
    }


@router.get("/match-runs/{run_id}")
def get_match_run(run_id: str, user_id: str = Depends(get_user_id)):
    """Fetch results of a previous recommendation run."""
    db = get_supabase()
    run = db.table("match_runs").select("*").eq("id", run_id).eq("user_id", user_id).execute()
    if not run.data:
        raise HTTPException(status_code=404, detail="Match run not found")

    matches = db.table("matches").select("*").eq("run_id", run_id).eq("user_id", user_id).execute()
    scholarships = db.table("scholarships").select("*").execute().data
    sch_by_id = {s["id"]: s for s in scholarships}

    enriched = []
    for m in matches.data:
        s = sch_by_id.get(m["scholarship_id"])
        if s:
            enriched.append({
                "scholarship": s,
                "match_score": m.get("match_score"),
                "ai_explanation": m.get("ai_explanation"),
                "embedding_score": m.get("embedding_score"),
                "score_components": m.get("score_components"),
                "ai_rank": m.get("ai_rank"),
                "next_steps": m.get("next_steps"),
                "overall_recommendation": m.get("overall_recommendation"),
            })

    enriched.sort(key=lambda x: (x.get("ai_rank") or 999, -(x.get("match_score") or 0)))

    return {
        "run_id": run_id,
        "status": run.data[0].get("status"),
        "total": len(enriched),
        "matches": enriched,
    }


@router.get("/{scholarship_id}")
def get_scholarship(scholarship_id: int):
    """Get a single scholarship by ID with all eligibility and qualities fields."""
    db = get_supabase()
    result = db.table("scholarships").select("*").eq("id", scholarship_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Scholarship not found")

    return result.data[0]


@router.get("/{scholarship_id}/readiness")
def get_readiness(
    scholarship_id: int,
    user_id: str = Depends(get_user_id),
):
    """
    Returns an AI-generated readiness score (0-100) and improvement tips
    for a specific scholarship.
    """
    db = get_supabase()

    user = db.table("users").select("*").eq("id", user_id).execute().data
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")

    scholarship = db.table("scholarships").select("*").eq("id", scholarship_id).execute().data
    if not scholarship:
        raise HTTPException(status_code=404, detail="Scholarship not found")

    score = readiness_score(user[0], scholarship[0])
    return score


@router.get("/{scholarship_id}/checklist")
def get_checklist(scholarship_id: int):
    """Returns a step-by-step application checklist for a scholarship."""
    db = get_supabase()
    result = db.table("scholarships").select("*").eq("id", scholarship_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Scholarship not found")

    s = result.data[0]

    checklist = [
        {"step": 1, "task": "Check eligibility requirements", "detail": s.get("eligibility")},
        {"step": 2, "task": "Prepare your resume", "detail": "Upload via your profile page"},
        {"step": 3, "task": "Gather your transcript", "detail": "Official or unofficial copy required"},
        {"step": 4, "task": "Write your personal essay", "detail": "Use the AI Assistant for help"},
        {"step": 5, "task": "Request reference letters", "detail": "Ask professors or community leaders"},
        {"step": 6, "task": "Complete application form", "detail": f"Submit at {s.get('link')}"},
        {"step": 7, "task": "Submit before deadline", "detail": f"Deadline: {s.get('deadline')}"},
    ]

    return {
        "scholarship": s.get("title"),
        "deadline": s.get("deadline"),
        "checklist": checklist,
    }
