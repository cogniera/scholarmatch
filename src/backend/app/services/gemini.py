from typing import Optional

# Gemini functionality disabled for now


def explain_match(user: dict, scholarship: dict, match_reasons: list) -> str:
    """Stub function - Gemini not used"""
    return "Match explanation not available at this time."


def application_chat(question: str, user: dict, scholarship=None, resume_text=None) -> str:
    """Stub function - Gemini not used"""
    return "AI chat not available at this time."


def readiness_score(user: dict, scholarship: dict) -> dict:
    """Stub function - Gemini not used"""
    return {
        "score": 75,
        "summary": "Readiness assessment not available at this time.",
        "tips": ["Complete your application carefully", "Gather all required documents", "Submit before deadline"]
    }