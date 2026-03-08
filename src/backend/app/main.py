"""
main.py — ScholarMatch FastAPI Application Entry Point
"""

import sys
from pathlib import Path

# When running this file directly (e.g. `python app/main.py`), Python
# adds the containing directory to sys.path which *doesn't* include the
# parent folder that holds the `app` package. That leads to
# "ModuleNotFoundError: No module named 'app'". To make the module
# import-safe regardless of current working directory, prepend the
# parent directory (src/backend) to sys.path.
package_root = Path(__file__).resolve().parent.parent
if str(package_root) not in sys.path:
    sys.path.insert(0, str(package_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# import routers using absolute package paths
from app.api.routes.profile import router as profile_router
from app.api.routes.scholarships import router as scholarships_router
from app.api.routes.uploads import router as uploads_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.roadmap import router as roadmap_router
from app.api.routes.automation import router as automation_router
from app.database.database import get_supabase
from app.utills.config import settings

app = FastAPI(
    title="ScholarMatch API",
    description="AI-powered scholarship discovery and application guidance platform",
    version="1.0.0",
)


@app.on_event("startup")
async def startup_event():
    """Verify database connectivity on startup."""
    print("=== Starting Supabase Connection Test ===")
    print(f"SUPABASE_URL: {settings.SUPABASE_URL}")
    print(f"SUPABASE_KEY: {'*' * len(settings.SUPABASE_KEY) if settings.SUPABASE_KEY else 'None'}")

    try:
        db = get_supabase()
        print("✓ Supabase client created successfully")

        test_result = db.table("users").select("id").limit(1).execute()
        print(f"✓ Database connection successful. Found {len(test_result.data)} existing users.")
    except Exception as e:
        print(f"✗ Database connection failed during startup: {str(e)}")
        print("Please check your SUPABASE_URL and SUPABASE_KEY in .env file")

# ── CORS ───────────────────────────────────────────────────────────────────────
# Update origins to your deployed frontend URL before going to production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Profile-Checks"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(profile_router)
app.include_router(scholarships_router)
app.include_router(uploads_router)
app.include_router(dashboard_router)
app.include_router(roadmap_router)
app.include_router(automation_router)


# ── Health Check ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "ScholarMatch API is running"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


@app.get("/test-supabase", tags=["Test"])
def test_supabase():
    """Test Supabase connection and return basic info."""
    try:
        db = get_supabase()
        
        # Test connection
        result = db.table("users").select("id").limit(5).execute()
        
        return {
            "status": "success",
            "message": "Supabase connection successful",
            "existing_users_count": len(result.data),
            "config": {
                "url_set": bool(settings.SUPABASE_URL and settings.SUPABASE_URL != "your_supabase_project_url_here"),
                "key_set": bool(settings.SUPABASE_KEY and settings.SUPABASE_KEY != "your_supabase_anon_key_here")
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Supabase connection failed: {str(e)}",
            "config": {
                "url_set": bool(settings.SUPABASE_URL and settings.SUPABASE_URL != "your_supabase_project_url_here"),
                "key_set": bool(settings.SUPABASE_KEY and settings.SUPABASE_KEY != "your_supabase_anon_key_here")
            }
        }

# If the module is executed as a script we want to launch Uvicorn so
# running `python app/main.py` behaves the same as `uvicorn app.main:app`.
# This is convenient for local development and avoids confusion about why
# nothing prints when you simply run the file directly.
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info",
    )
