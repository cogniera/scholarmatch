"""
auth.py — Auth0 JWT verification for FastAPI
Validates Bearer tokens issued by Auth0 on every protected route.
"""

import os
import httpx
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from functools import lru_cache

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
ALGORITHMS = ["RS256"]

security = HTTPBearer()


@lru_cache(maxsize=1)
def get_jwks() -> dict:
    """Fetch Auth0 public keys (cached so we only hit Auth0 once per process)."""
    url = f"https://{AUTH0_DOMAIN}/.well-known/jwks.json"
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    return response.json()


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Dependency — validates the JWT and returns the decoded payload.
    
    Usage:
        @app.get("/protected")
        def protected_route(user: dict = Depends(verify_token)):
            return {"user_id": user["sub"]}
    """
    token = credentials.credentials

    try:
        jwks = get_jwks()

        # Decode header to find the right key
        unverified_header = jwt.get_unverified_header(token)

        rsa_key = {}
        for key in jwks["keys"]:
            if key["kid"] == unverified_header["kid"]:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n":   key["n"],
                    "e":   key["e"],
                }
                break

        if not rsa_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find matching public key",
            )

        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=ALGORITHMS,
            audience=AUTH0_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/",
        )
        return payload

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}",
        )


def get_user_id(user: dict = Depends(verify_token)) -> str:
    """Convenience dependency — returns just the Auth0 user ID (sub claim)."""
    return user["sub"]
