"""
main.py — ScholarMatch FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.api.routes import profile, scholarships, uploads

app = FastAPI(
    title="ScholarMatch API",
    description="AI-powered scholarship discovery and application guidance platform",
    version="1.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────────
# Update origins to your deployed frontend URL before going to production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(profile.router)
app.include_router(scholarships.router)
app.include_router(uploads.router)


# ── Health Check ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "message": "ScholarMatch API is running"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
