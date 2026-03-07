"""
routers/profile.py — Student profile endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import verify_token, get_user_id
from app.database import get_supabase
from app.models import ProfileCreate, ProfileUpdate, ProfileResponse

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    body: ProfileCreate,
    user_id: str = Depends(get_user_id),
):
    """
    Create a student profile. The user_id comes from the verified Auth0 JWT
    so students can only create their own profile.
    """
    db = get_supabase()

    # Check if profile already exists
    existing = db.table("users").select("id").eq("id", user_id).execute()
    if existing.data:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile already exists. Use PATCH to update.",
        )

    payload = {
        "id": user_id,
        **body.model_dump(),
    }

    result = db.table("users").insert(payload).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create profile")

    return result.data[0]


@router.get("", response_model=ProfileResponse)
def get_profile(user_id: str = Depends(get_user_id)):
    """Fetch the current user's profile."""
    db = get_supabase()
    result = db.table("users").select("*").eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return result.data[0]


@router.patch("", response_model=ProfileResponse)
def update_profile(
    body: ProfileUpdate,
    user_id: str = Depends(get_user_id),
):
    """Partially update the current user's profile."""
    db = get_supabase()

    # Only include fields that were actually provided
    updates = {k: v for k, v in body.model_dump().items() if v is not None}

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    result = (
        db.table("users")
        .update(updates)
        .eq("id", user_id)
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return result.data[0]


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(user_id: str = Depends(get_user_id)):
    """Delete the current user's profile and all their matches."""
    db = get_supabase()
    db.table("users").delete().eq("id", user_id).execute()
