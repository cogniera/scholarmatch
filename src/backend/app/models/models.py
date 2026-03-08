"""
models.py — Pydantic request/response schemas
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date


# ── User / Profile ────────────────────────────────────────────────────────────

class ProfileCreate(BaseModel):
    name: str
    email: str
    gpa: float = Field(ge=0.0, le=4.0)
    program: str
    location: str
    academic_level: str  # High School | Undergraduate | Graduate | PhD
    financial_need: bool = False
    extracurriculars: Optional[str] = None
    career_interests: Optional[str] = None
    university: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    gpa: Optional[float] = Field(default=None, ge=0.0, le=4.0)
    program: Optional[str] = None
    location: Optional[str] = None
    academic_level: Optional[str] = None
    financial_need: Optional[bool] = None
    extracurriculars: Optional[str] = None
    resume_url: Optional[str] = None
    transcript_url: Optional[str] = None
    career_interests: Optional[str] = None
    university: Optional[str] = None


class ProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    gpa: Optional[float]
    program: Optional[str]
    location: Optional[str]
    academic_level: Optional[str]
    financial_need: Optional[bool]
    extracurriculars: Optional[str]
    resume_url: Optional[str]
    transcript_url: Optional[str]
    career_interests: Optional[str] = None
    university: Optional[str] = None
    profile_strength: Optional[int] = None


# ── Scholarships ──────────────────────────────────────────────────────────────

class ScholarshipResponse(BaseModel):
    id: int
    title: str
    provider: Optional[str]
    amount: Optional[int]
    deadline: Optional[date]
    eligibility: Optional[str]
    location: Optional[str]
    program: Optional[str]
    gpa_requirement: Optional[float]
    financial_need_required: Optional[bool]
    academic_level: Optional[str]
    link: Optional[str]


class MatchResponse(BaseModel):
    scholarship: ScholarshipResponse
    match_score: float
    ai_explanation: Optional[str] = None


# ── Uploads ───────────────────────────────────────────────────────────────────

class UploadURLSave(BaseModel):
    resume_url: Optional[str] = None
    transcript_url: Optional[str] = None


# ── Chatbot ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    scholarship_id: Optional[int] = None   # Provide context about a specific scholarship
    include_profile: bool = True            # Inject student profile into context
    scholarships_summary: Optional[list[dict]] = None  # For organize instructions (id, title, amount, deadline, match_score)
