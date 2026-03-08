"""
database.py — Supabase client singleton
"""

import os
from supabase import create_client, Client
from functools import lru_cache
from app.utills.config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_KEY
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in settings")
    return create_client(url, key)
