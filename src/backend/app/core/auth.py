"""
core/auth.py

Auth helpers with dual-mode behavior:

- Dev mode (no Auth0 envs set):
  - Behaves like before: reads user id from X-User-Id header.
  - Authorization header is treated as an opaque bearer token and NOT validated.

- Auth0 mode (AUTH0_DOMAIN + AUTH0_AUDIENCE configured):
  - Verifies RS256 JWT access tokens issued by Auth0.
  - get_user_id falls back to JWT `sub` when X-User-Id is absent.

This ensures nothing breaks if you haven't wired Auth0 yet, while allowing
end-to-end Auth0 once env vars and frontend tokens are in place.
"""

from functools import lru_cache
from typing import Optional

from fastapi import Header, HTTPException, status
from jose import jwt
import requests

from app.utills.config import settings

ALGORITHMS = ["RS256"]


def _auth0_enabled() -> bool:
    return bool(settings.AUTH0_DOMAIN and settings.AUTH0_AUDIENCE)


@lru_cache(maxsize=1)
def _get_jwks():
    """
    Fetch Auth0 JWKS once per process. Returns None when Auth0 is not configured.
    """
    if not _auth0_enabled():
        return None
    jwks_url = f"https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json"
    resp = requests.get(jwks_url, timeout=5)
    resp.raise_for_status()
    return resp.json()


def _decode_auth0_token(token: str) -> dict:
    """
    Decode and validate an Auth0 JWT. Raises HTTPException on failure.
    """
    if not _auth0_enabled():
        # Dev mode: do NOT fail hard, just echo token as sub for compatibility.
        return {"sub": token}

    jwks = _get_jwks()
    if not jwks:
        raise HTTPException(status_code=500, detail="Auth0 JWKS not available")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token header")

    kid = unverified_header.get("kid")
    key = None
    for jwk in jwks.get("keys", []):
        if jwk.get("kid") == kid:
            key = jwk
            break

    if key is None:
        raise HTTPException(status_code=401, detail="Invalid token header")

    issuer = f"https://{settings.AUTH0_DOMAIN}/"

    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=ALGORITHMS,
            audience=settings.AUTH0_AUDIENCE,
            issuer=issuer,
        )
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def verify_token(authorization: Optional[str] = Header(default=None)) -> dict:
    """
    Unified verifier used by any endpoint that wants JWT payloads.

    - If no Authorization header is present, returns {'sub': None}.
    - In dev mode (no Auth0 envs) returns {'sub': raw_token} without validation.
    - In Auth0 mode, validates the token and returns the decoded payload.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return {"sub": None}

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return {"sub": None}

    return _decode_auth0_token(token)


def get_user_id(
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> str:
    """
    Resolve the current user id.

    Priority:
      1. X-User-Id header (backwards-compatible dev mode)
      2. Auth0 Bearer token `sub` claim when present and valid

    If neither is available, raise 401.
    """
    # 1) Backwards-compatible: prefer explicit X-User-Id when provided.
    if x_user_id and x_user_id.strip():
        return x_user_id.strip()

    # 2) Try Auth0 JWT (or dev-mode stub)
    payload = verify_token(authorization)
    sub = payload.get("sub")
    if sub:
        return str(sub)

    # 3) No identity information
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Missing identity. Provide X-User-Id or a valid Bearer token.",
    )

