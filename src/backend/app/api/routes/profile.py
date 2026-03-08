"""
routers/profile.py — Student profile endpoints
"""

import json
import re
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
from app.core.auth import get_user_id
from app.database.database import get_supabase
from app.models.models import ProfileCreate, ProfileUpdate, ProfileResponse

router = APIRouter(prefix="/profile", tags=["Profile"])


UNKNOWN_COLUMN_RE = re.compile(r"Could not find the '([^']+)' column")


def _strip_unknown_column_and_retry(operation_fn, payload: dict, checks: list, step_name: str):
    """
    Execute a Supabase write operation and auto-strip unknown columns (PGRST204).
    This prevents hard failures when frontend sends fields not yet present in DB schema.
    """
    mutable_payload = dict(payload)

    while True:
        try:
            return operation_fn(mutable_payload), mutable_payload
        except APIError as exc:
            error = getattr(exc, "args", [{}])[0]
            if not isinstance(error, dict) or error.get("code") != "PGRST204":
                raise

            message = error.get("message", "")
            match = UNKNOWN_COLUMN_RE.search(message)
            unknown_column = match.group(1) if match else None

            if not unknown_column or unknown_column not in mutable_payload:
                raise

            mutable_payload.pop(unknown_column, None)
            checks.append({
                "layer": "backend",
                "step": step_name,
                "status": "ok",
                "message": f"Dropped unsupported DB column '{unknown_column}' and retried write",
            })

            if not mutable_payload:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "No valid profile fields remain after schema filtering",
                        "checks": checks,
                    },
                )


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
        **body.model_dump(exclude_none=True),
    }

    checks.append({
        "layer": "backend",
        "step": "insert_payload_prepared",
        "status": "ok",
        "message": "Insert payload assembled",
        "meta": {"column_count": len(payload)},
    })

    def _insert_operation(filtered_payload):
        return db.table("users").insert(filtered_payload).execute()

    result, filtered_payload = _strip_unknown_column_and_retry(
        _insert_operation,
        payload,
        checks,
        "db_schema_filter",
    )

    checks.append({
        "layer": "backend",
        "step": "insert_payload_filtered",
        "status": "ok",
        "message": "Insert payload aligned to DB schema",
        "meta": {"column_count": len(filtered_payload), "columns": sorted(filtered_payload.keys())},
    })

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


def _compute_profile_strength(profile: dict) -> int:
    """Compute profile completeness 0-100."""
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


@router.get("", response_model=ProfileResponse)
def get_profile(user_id: str = Depends(get_user_id)):
    """Fetch the current user's profile with computed profile_strength."""
    db = get_supabase()
    result = db.table("users").select("*").eq("id", user_id).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    data = dict(result.data[0])
    data["profile_strength"] = _compute_profile_strength(data)
    return data


@router.patch("", response_model=ProfileResponse)
def update_profile(
    body: ProfileUpdate,
    user_id: str = Depends(get_user_id),
):
    """Partially update the current user's profile."""
    db = get_supabase()

    # Only include fields that were actually provided
    updates = {k: v for k, v in body.model_dump(exclude_none=True).items() if v is not None}

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")

    def _update_operation(filtered_updates):
        return (
            db.table("users")
            .update(filtered_updates)
            .eq("id", user_id)
            .execute()
        )

    update_checks = []
    result, filtered_updates = _strip_unknown_column_and_retry(
        _update_operation,
        updates,
        update_checks,
        "db_schema_filter",
    )

    if not filtered_updates:
        raise HTTPException(status_code=400, detail="No valid fields provided to update")

    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return result.data[0]


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(user_id: str = Depends(get_user_id)):
    """Delete the current user's profile and all their matches."""
    db = get_supabase()
    db.table("users").delete().eq("id", user_id).execute()
