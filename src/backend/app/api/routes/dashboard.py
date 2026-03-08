"""
routers/dashboard.py — Dashboard stats and roadmap endpoints
"""

from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_user_id
from app.database.database import get_supabase

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _compute_profile_strength(profile: dict) -> int:
    """Compute profile completeness 0-100 from user fields."""
    if not profile:
        return 0
    fields = [
        bool(profile.get("name")),
        bool(profile.get("email")),
        profile.get("gpa") is not None,
        bool(profile.get("program")),
        bool(profile.get("location")),
        bool(profile.get("academic_level")),
        bool(profile.get("resume_url")),
        bool(profile.get("transcript_url")),
        bool(profile.get("extracurriculars")),
        bool(profile.get("career_interests")),
    ]
    return min(100, int(sum(fields) / len(fields) * 100))


@router.get("/stats")
def get_dashboard_stats(user_id: str = Depends(get_user_id)):
    """
    Return dashboard stats from database:
    - matched_scholarships: count of matches for user
    - total_value_matched: sum of scholarship amounts from matches
    - applications_started: count of applications (from state; we use saved matches as proxy)
    - profile_strength: computed from profile completeness 0-100
    """
    db = get_supabase()

    profile = db.table("users").select("*").eq("id", user_id).execute().data
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile = profile[0]

    run_id = None
    matches = []
    try:
        runs = db.table("match_runs").select("id").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        run_id = runs.data[0]["id"] if runs.data else None
    except Exception:
        pass

    try:
        if run_id:
            matches = db.table("matches").select("scholarship_id, match_score").eq("user_id", user_id).eq("run_id", run_id).execute().data
        else:
            matches = db.table("matches").select("scholarship_id, match_score").eq("user_id", user_id).execute().data
            if matches and len(matches) > 50:
                matches = matches[:50]
    except Exception:
        matches = []

    scholarships = db.table("scholarships").select("id, amount").execute().data
    sch_by_id = {s["id"]: s for s in scholarships}

    total_value = 0
    for m in matches:
        sch = sch_by_id.get(m["scholarship_id"])
        if sch and sch.get("amount"):
            total_value += int(sch["amount"]) or 0

    profile_strength = _compute_profile_strength(profile)

    return {
        "matched_scholarships": len(matches),
        "total_value_matched": total_value,
        "applications_started": len(matches),  # Use match count as proxy; can add applications table later
        "profile_strength": profile_strength,
    }


@router.get("/upcoming-deadlines")
def get_upcoming_deadlines(
    limit: int = 5,
    user_id: str = Depends(get_user_id),
):
    """
    Return scholarships with nearest future deadlines only.
    Excludes past deadlines and zero/invalid dates.
    """
    db = get_supabase()
    today = date.today().isoformat()

    run_id = None
    try:
        runs = db.table("match_runs").select("id").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        run_id = runs.data[0]["id"] if runs.data else None
    except Exception:
        pass

    matches = []
    try:
        if run_id:
            matches = db.table("matches").select("scholarship_id").eq("user_id", user_id).eq("run_id", run_id).execute().data
        else:
            matches = db.table("matches").select("scholarship_id").eq("user_id", user_id).execute().data
    except Exception:
        pass

    sch_ids = list({m["scholarship_id"] for m in matches})
    if not sch_ids:
        return {"deadlines": []}

    scholarships = db.table("scholarships").select("id, title, provider, amount, deadline, link").in_("id", sch_ids).execute().data

    # Filter: deadline must be in the future (>= today), exclude past and invalid
    valid = []
    for s in scholarships:
        d = s.get("deadline")
        if not d:
            continue
        try:
            d_str = str(d)[:10] if d else ""
            if d_str >= today:
                valid.append({**s, "deadline": d_str})
        except Exception:
            continue

    valid.sort(key=lambda x: x["deadline"])
    return {"deadlines": valid[:limit]}
