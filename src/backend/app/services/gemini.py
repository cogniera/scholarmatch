from typing import Optional, Dict, Any, List

from app.services.ai_search import run_ai_loop


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


def application_chat(question: str, user: dict, scholarship=None, resume_text=None) -> str:
    """Stub function - chat not integrated yet."""
    return "AI chat not available at this time."


def readiness_score(user: dict, scholarship: dict) -> dict:
    """Stub function - readiness scoring can be enhanced later."""
    return {
        "score": 75,
        "summary": "Readiness assessment not available at this time.",
        "tips": ["Complete your application carefully", "Gather all required documents", "Submit before deadline"]
    }