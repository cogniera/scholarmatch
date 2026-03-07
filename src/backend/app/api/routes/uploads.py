"""
routers/uploads.py — Cloudinary upload URL saving + AI chatbot
"""

from fastapi import APIRouter, Depends, HTTPException
from backend.app.core.auth import get_user_id
from backend.app.database.database import get_supabase
from backend.app.models.models import UploadURLSave, ChatRequest
from app.services.gemini import application_chat

router = APIRouter(tags=["Uploads & Chat"])


# ── Cloudinary Upload URL Save ─────────────────────────────────────────────────
# Note: The actual file upload happens on the FRONTEND directly to Cloudinary.
# The frontend sends us just the secure URL returned by Cloudinary.

@router.post("/upload")
def save_upload_urls(
    body: UploadURLSave,
    user_id: str = Depends(get_user_id),
):
    """
    Save Cloudinary URLs for resume and/or transcript.
    
    Flow:
      1. Frontend uploads file directly to Cloudinary
      2. Cloudinary returns secure_url
      3. Frontend calls this endpoint with the URL
      4. We store it in the user's profile
    """
    db = get_supabase()

    updates = {}
    if body.resume_url:
        updates["resume_url"] = body.resume_url
    if body.transcript_url:
        updates["transcript_url"] = body.transcript_url

    if not updates:
        raise HTTPException(status_code=400, detail="Provide at least one URL to save")

    result = db.table("users").update(updates).eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    return {"status": "saved", "updated_fields": list(updates.keys())}


# ── AI Chatbot ─────────────────────────────────────────────────────────────────

@router.post("/chat")
def chat(
    body: ChatRequest,
    user_id: str = Depends(get_user_id),
):
    """
    RAG-powered scholarship application assistant.
    
    Injects student profile + target scholarship as context for Gemini.
    Optionally accepts a scholarship_id for scholarship-specific advice.
    """
    db = get_supabase()

    # Always include user profile
    user_result = db.table("users").select("*").eq("id", user_id).execute()
    if not user_result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    user = user_result.data[0]

    # Optionally include scholarship context
    scholarship = None
    if body.scholarship_id:
        s_result = db.table("scholarships").select("*").eq("id", body.scholarship_id).execute()
        if s_result.data:
            scholarship = s_result.data[0]

    response_text = application_chat(
        question=body.question,
        user=user,
        scholarship=scholarship,
    )

    return {
        "question": body.question,
        "response": response_text,
        "context_used": {
            "profile": True,
            "scholarship": scholarship.get("title") if scholarship else None,
        }
    }
