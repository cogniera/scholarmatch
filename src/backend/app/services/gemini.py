from typing import Optional, Dict, Any, List
import json
import os

from app.services.ai_search import run_ai_loop


def _get_chat_model():
    """Lazy init of Gemini model for chat."""
    try:
        import google.generativeai as genai
        key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            return None
        genai.configure(api_key=key)
        return genai.GenerativeModel("gemini-2.0-flash")
    except Exception:
        return None


def explain_match(user: dict, scholarship: dict, match_reasons: list) -> str:
    """
    Run AI compare/judge/next-steps loop and return ai_explanation string.
    Used when explain=true on recommendations.
    """
    result = run_ai_loop(user, scholarship, match_reasons or [])
    return result.get("ai_explanation", "Match explanation not available at this time.")


def explain_match_full(
    user: dict, scholarship: dict, match_reasons: list
) -> Dict[str, Any]:
    """
    Full AI loop result: ai_explanation, next_steps, overall_recommendation.
    """
    return run_ai_loop(user, scholarship, match_reasons or [])


def _fallback_chat(question: str) -> Dict[str, Any]:
    """
    Keyword-based fallback when Gemini is unavailable. Handles organize requests
    and common questions so the chatbot always works.
    """
    q = question.lower().strip()
    organize = None
    response = ""

    # Organize: sort by deadline
    if any(w in q for w in ["sort by deadline", "by deadline", "deadline first", "soonest", "upcoming first"]):
        organize = {"sortBy": "deadline", "order": "asc"}
        response = "I've organized your scholarships by deadline — soonest first."
    # Organize: sort by amount (highest first)
    elif any(w in q for w in ["highest amount", "most money", "biggest award", "sort by amount", "amount first", "by amount"]):
        organize = {"sortBy": "amount", "order": "desc"}
        response = "I've sorted your scholarships by amount — highest awards first."
    # Organize: sort by match score
    elif any(w in q for w in ["best match", "match score", "sort by match", "top match", "highest match"]):
        organize = {"sortBy": "matchScore", "order": "desc"}
        response = "I've sorted your scholarships by match score — best matches first."
    # Filter: minimum amount
    elif any(w in q for w in ["$5000", "5000+", "over 5000", "at least 5000", "minimum 5000"]):
        organize = {"filterMinAmount": 5000}
        response = "Showing scholarships of $5,000 or more."
    elif any(w in q for w in ["$10000", "10000+", "over 10000", "10k+"]):
        organize = {"filterMinAmount": 10000}
        response = "Showing scholarships of $10,000 or more."
    elif any(w in q for w in ["$1000", "1000+", "over 1000"]):
        organize = {"filterMinAmount": 1000}
        response = "Showing scholarships of $1,000 or more."
    # Filter: minimum match
    elif any(w in q for w in ["80%", "80 percent", "80%+", "above 80"]):
        organize = {"filterMinMatch": 80}
        response = "Showing scholarships with 80% match or higher."
    elif any(w in q for w in ["90%", "90 percent", "90%+", "above 90"]):
        organize = {"filterMinMatch": 90}
        response = "Showing scholarships with 90% match or higher."
    elif any(w in q for w in ["60%", "60 percent", "60%+", "above 60"]):
        organize = {"filterMinMatch": 60}
        response = "Showing scholarships with 60% match or higher."
    # General help
    elif any(w in q for w in ["help", "what can you do", "how does this work"]):
        response = "I can help you organize your scholarships! Try saying:\n• \"Sort by deadline\" — soonest deadlines first\n• \"Show highest amount first\" — biggest awards first\n• \"Only $5000+\" — filter by minimum amount\n• \"80% match and above\" — filter by match score"
    elif any(w in q for w in ["hello", "hi", "hey"]):
        response = "Hi! Ask me to sort or filter your scholarships, or ask any question about scholarships."
    else:
        response = "I can sort or filter your scholarships — try \"sort by deadline\" or \"show highest amount first.\" For more options, say \"help\"."

    return {"response": response, "organize": organize}


def application_chat(
    question: str,
    user: dict,
    scholarship=None,
    resume_text=None,
    scholarships_summary: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """
    AI-powered scholarship assistant. Returns { response, organize? }.
    Uses keyword fallback when Gemini is unavailable so chat always works.
    """
    # Try Gemini first if available
    model = _get_chat_model()
    if model:
        try:
            user_context = _build_user_context(user)
            sch_context = ""
            if scholarship:
                sch_context = f"\n\nScholarship: {json.dumps(scholarship, default=str)}"
            summary_context = ""
            if scholarships_summary:
                summary_context = f"\n\nScholarships: {json.dumps(scholarships_summary[:30], default=str)}"

            prompt = f"""You are a helpful ScholarMatch assistant. Help with scholarships.

Context: {user_context}{sch_context}{summary_context}

User: {question}

If the user wants to SORT or FILTER scholarships, reply with ONLY this JSON (no other text):
{{"sortBy":"deadline"|"amount"|"matchScore","order":"asc"|"desc","filterMinAmount":number|null,"filterMinMatch":number|null}}

Examples: "sort by deadline" -> {{"sortBy":"deadline","order":"asc"}}
"highest amount" -> {{"sortBy":"amount","order":"desc"}}
"only $5000+" -> {{"filterMinAmount":5000}}

Otherwise give a short helpful reply (1-2 sentences)."""

            response = model.generate_content(
                prompt,
                generation_config={"temperature": 0.2},
            )
            text = (response.text or "").strip()
            if text:
                # Try to parse as JSON (organize intent)
                try:
                    if text.startswith("{"):
                        organize = json.loads(text)
                        allowed = {"sortBy", "order", "filterMinAmount", "filterMinMatch"}
                        organize = {k: v for k, v in organize.items() if k in allowed and v is not None}
                        if organize:
                            return {"response": "Done! I've updated the display.", "organize": organize}
                except json.JSONDecodeError:
                    pass
                return {"response": text, "organize": None}
        except Exception:
            pass  # Fall through to fallback

    return _fallback_chat(question)


def _build_user_context(user: dict) -> str:
    """Build a concise user context string."""
    parts = []
    if user.get("name"):
        parts.append(f"Name: {user['name']}")
    if user.get("academic_level"):
        parts.append(f"Academic level: {user['academic_level']}")
    if user.get("program"):
        parts.append(f"Program: {user['program']}")
    if user.get("gpa") is not None:
        parts.append(f"GPA: {user['gpa']}")
    if user.get("location"):
        parts.append(f"Location: {user['location']}")
    if user.get("financial_need") is not None:
        parts.append(f"Financial need: {user['financial_need']}")
    if user.get("career_interests"):
        parts.append(f"Career interests: {user['career_interests']}")
    if user.get("extracurriculars"):
        parts.append(f"Extracurriculars: {user['extracurriculars']}")
    return "\n".join(parts) if parts else "No profile info available"


def readiness_score(user: dict, scholarship: dict) -> dict:
    """Stub function - readiness scoring can be enhanced later."""
    return {
        "score": 75,
        "summary": "Readiness assessment not available at this time.",
        "tips": ["Complete your application carefully", "Gather all required documents", "Submit before deadline"]
    }