"""
core/auth.py

Lightweight identity helpers for local no-auth mode.
"""

from typing import Optional
from fastapi import Header, HTTPException, status


def verify_token(authorization: Optional[str] = Header(default=None)) -> dict:
    """
    Legacy-compatible stub used by older imports.

    In no-auth mode we don't validate JWTs, but we still return a shape
    that includes a user subject when available.
    """
    x_user_id = None
    if authorization and authorization.lower().startswith('bearer '):
        x_user_id = authorization.split(' ', 1)[1].strip() or None

    return {'sub': x_user_id}


def get_user_id(
    x_user_id: Optional[str] = Header(default=None, alias='X-User-Id'),
) -> str:
    """
    Read user identity from X-User-Id header.

    Frontend stores this id after profile creation and sends it on
    profile-dependent endpoints (uploads, matches, updates).
    """
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Missing X-User-Id header. Create a profile first.',
    )
