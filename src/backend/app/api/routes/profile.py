"""
routers/profile.py — Student profile endpoints
"""

import json
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse
from app.core.auth import get_user_id
from app.database.database import get_supabase
from app.models.models import ProfileCreate, ProfileUpdate, ProfileResponse

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    body: ProfileCreate,
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
):
    """
    Create a student profile.

    If X-User-Id is not provided, a new UUID is generated and returned.
    """
    normalized_user_id = x_user_id.strip() if x_user_id else ""
    user_id = normalized_user_id or str(uuid4())
    checks = []
    checks.append({"layer": "backend", "step": "request_received", "status": "ok", "message": "POST /profile received"})

    db = get_supabase()
    checks.append({"layer": "backend", "step": "db_client_ready", "status": "ok", "message": "Supabase client initialized"})

    request_fields = sorted(body.model_dump().keys())
    checks.append({
        "layer": "backend",
        "step": "payload_validated",
        "status": "ok",
        "message": "ProfileCreate schema validation passed",
        "meta": {"fields": request_fields},
    })

    # Check if profile already exists
    existing = db.table("users").select("id").eq("id", user_id).execute()
    if existing.data:
        checks.append({
            "layer": "backend",
            "step": "existing_profile_check",
            "status": "error",
            "message": "Profile already exists for this user",
        })
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "Profile already exists. Use PATCH to update.",
                "checks": checks,
            },
        )

    checks.append({"layer": "backend", "step": "existing_profile_check", "status": "ok", "message": "No existing profile found"})

    payload = {
        "id": user_id,
        **body.model_dump(),
    }

    checks.append({
        "layer": "backend",
        "step": "insert_payload_prepared",
        "status": "ok",
        "message": "Insert payload assembled",
        "meta": {"column_count": len(payload)},
    })

    result = db.table("users").insert(payload).execute()

    if not result.data:
        checks.append({"layer": "backend", "step": "db_insert", "status": "error", "message": "Supabase insert returned empty result"})
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Failed to create profile",
                "checks": checks,
            },
        )

    checks.append({"layer": "backend", "step": "db_insert", "status": "ok", "message": "Profile inserted into users table"})

    persisted = db.table("users").select("*").eq("id", user_id).limit(1).execute()
    if not persisted.data:
        checks.append({
            "layer": "backend",
            "step": "db_persist_verify",
            "status": "error",
            "message": "Insert completed but persisted row could not be verified",
        })
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Profile save could not be verified",
                "checks": checks,
            },
        )

    checks.append({
        "layer": "backend",
        "step": "db_persist_verify",
        "status": "ok",
        "message": "Persisted row verified by id",
    })
    checks.append({"layer": "backend", "step": "response_ready", "status": "ok", "message": "Returning created profile"})

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content=persisted.data[0],
        headers={"X-Profile-Checks": json.dumps(checks, separators=(",", ":"))},
    )


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
