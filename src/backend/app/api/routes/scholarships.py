"""
routers/scholarships.py — Scholarship browsing + matching endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from backend.app.core.auth import get_user_id
from backend.app.database.database import get_supabase
from app.services.matching import match_scholarships
from app.services.gemini import explain_match, readiness_score
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
    explain: bool = Query(False, description="Ask Gemini to explain each match (slower)"),
    user_id: str = Depends(get_user_id),
):
    """
    Return scholarships matched to the current student's profile.
    Set ?explain=true to include AI explanations (adds ~2-3 seconds per match).
    """
    db = get_supabase()

    # Fetch user profile
    user_result = db.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Profile not found. Create your profile first.")
    user = user_result.data[0]

    # Fetch all scholarships
    scholarships = db.table("scholarships").select("*").execute().data

    # Run matching engine
    matches = match_scholarships(user, scholarships)

    # Optionally enrich with Gemini explanations
    if explain:
        for m in matches:
            try:
                m["ai_explanation"] = explain_match(
                    user, m["scholarship"], m["match_reasons"]
                )
                # Cache explanation in DB
                db.table("matches").upsert({
                    "user_id": user_id,
                    "scholarship_id": m["scholarship"]["id"],
                    "match_score": m["match_score"],
                    "ai_explanation": m["ai_explanation"],
                }).execute()
            except Exception:
                m["ai_explanation"] = "Unable to generate explanation at this time."

    return {
        "total": len(matches),
        "matches": matches,
    }


@router.get("/{scholarship_id}")
def get_scholarship(scholarship_id: int):
    """Get a single scholarship by ID."""
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
