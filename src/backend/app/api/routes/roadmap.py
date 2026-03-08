"""
routers/roadmap.py — Roadmap generation and retrieval
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_user_id
from app.database.database import get_supabase
from app.services.matching import match_scholarships
from app.services.gemini import explain_match_full
from app.services.roadmap_service import run_research_agent

router = APIRouter(prefix="/roadmap", tags=["Roadmap"])


@router.get("")
def get_roadmap(user_id: str = Depends(get_user_id)):
    """Fetch the latest roadmap for the user from database."""
    db = get_supabase()

    roadmap = (
        db.table("user_roadmaps")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    if not roadmap.data:
        return {"steps": [], "message": "No roadmap yet. Generate one with POST /roadmap/generate"}

    return {
        "id": roadmap.data[0]["id"],
        "steps": roadmap.data[0].get("steps", []),
        "created_at": roadmap.data[0].get("created_at"),
    }


@router.post("/generate")
def generate_roadmap(user_id: str = Depends(get_user_id)):
    """
    Run AI loop on top 3, then research agent with MCP tools,
    build plan, store in user_roadmaps.
    """
    db = get_supabase()

    user = db.table("users").select("*").eq("id", user_id).execute().data
    if not user:
        raise HTTPException(status_code=404, detail="Profile not found")
    user = user[0]

    scholarships = db.table("scholarships").select("*").execute().data
    matches = match_scholarships(user, scholarships, top_n=50)

    # Run AI loop on top 3 only
    top3 = matches[:3]
    for m in top3:
        if not m.get("next_steps"):
            try:
                result = explain_match_full(
                    user,
                    m["scholarship"],
                    m.get("match_reasons", []),
                )
                m["next_steps"] = result.get("next_steps", [])
                m["ai_match_score"] = result.get("ai_match_score", 75)
            except Exception:
                m["next_steps"] = []
                m["ai_match_score"] = 75

    # Research agent: use MCP tools, get best plan
    steps = run_research_agent(top3, user)

    # Store in database
    roadmap_id = str(uuid.uuid4())
    try:
        db.table("user_roadmaps").insert({
            "id": roadmap_id,
            "user_id": user_id,
            "steps": steps,
            "config": {"source": "research_agent", "top_n": 3},
        }).execute()
    except Exception:
        pass

    return {
        "id": roadmap_id,
        "steps": steps,
        "message": "Roadmap generated from top 3 AI recommendations",
    }
