"""
ai_search.py — Google AI compare/judge/next-steps orchestration

Compare agent: given user JSON + scholarship JSON, produces structured comparison.
Judge agent: inspects compare output, returns pass/fail.
Next-steps agent: when judge passes, produces concrete action steps.

Prompts are placeholder/empty per plan; structure is ready for prompt engineering.
"""

from typing import Dict, Any, List, Optional
import json
import os


# Placeholder prompts (empty per plan; add structured prompts later)
COMPARE_SYSTEM_PROMPT = ""
JUDGE_SYSTEM_PROMPT = ""
NEXT_STEPS_SYSTEM_PROMPT = ""


def _get_model():
    """Lazy init of Gemini model. Returns None if API key not configured."""
    try:
        import google.generativeai as genai
        key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            return None
        genai.configure(api_key=key)
        return genai.GenerativeModel("gemini-2.0-flash")
    except Exception:
        return None


def _user_json(user: Dict[str, Any]) -> Dict[str, Any]:
    """Curated user object for compare agent."""
    return {
        "id": str(user.get("id", "")),
        "name": user.get("name"),
        "academic_level": user.get("academic_level"),
        "program": user.get("program"),
        "location": user.get("location"),
        "gpa": user.get("gpa"),
        "financial_need": user.get("financial_need"),
        "extracurriculars": user.get("extracurriculars"),
        "career_interests": user.get("career_interests"),
        "demographics": user.get("demographics"),
        "documents": {
            "resume": bool(user.get("resume_url")),
            "transcript": bool(user.get("transcript_url")),
        },
    }


def _scholarship_json(scholarship: Dict[str, Any]) -> Dict[str, Any]:
    """Curated scholarship object for compare agent."""
    return {
        "id": scholarship.get("id"),
        "title": scholarship.get("title"),
        "provider": scholarship.get("provider"),
        "amount": scholarship.get("amount"),
        "deadline": str(scholarship.get("deadline") or ""),
        "eligibility_text": scholarship.get("eligibility"),
        "gpa_requirement": scholarship.get("gpa_requirement") or scholarship.get("min_gpa"),
        "qualities_required": scholarship.get("qualities_required"),
        "link": scholarship.get("link"),
    }


def _call_llm(
    system_prompt: str,
    user_message: str,
    model=None,
) -> str:
    """Single LLM call. Returns empty string if model unavailable."""
    if model is None:
        model = _get_model()
    if model is None:
        return ""
    try:
        content = system_prompt + "\n\n" + user_message if system_prompt else user_message
        response = model.generate_content(
            content,
            generation_config={"temperature": 0.2},
        )
        if response and response.text:
            return response.text.strip()
    except Exception:
        pass
    return ""


def run_compare_agent(
    user: Dict[str, Any],
    scholarship: Dict[str, Any],
    match_reasons: List[str],
    judge_feedback: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compare agent output structure:
    is_good_match, reasons, risks_or_gaps, ideal_candidate_profile, structured_scores.
    """
    user_js = json.dumps(_user_json(user), default=str, indent=2)
    sch_js = json.dumps(_scholarship_json(scholarship), default=str, indent=2)
    reasons_str = "\n".join(f"- {r}" for r in (match_reasons or []))

    user_message = f"""Compare this student with this scholarship and return a JSON object with:
- is_good_match (boolean)
- reasons (list of strings)
- risks_or_gaps (list of strings)
- ideal_candidate_profile (string)
- structured_scores (optional: fit_academic, fit_need, fit_interests as 0-1 floats)

Student JSON:
{user_js}

Scholarship JSON:
{sch_js}

Existing match reasons:
{reasons_str}
"""
    if judge_feedback:
        user_message += f"\n\nJudge feedback (improve your analysis): {judge_feedback}\n"

    if COMPARE_SYSTEM_PROMPT:
        user_message = f"{COMPARE_SYSTEM_PROMPT}\n\n{user_message}"

    raw = _call_llm(COMPARE_SYSTEM_PROMPT or "You are a scholarship matching expert. Output valid JSON only.", user_message)
    if not raw:
        return {
            "is_good_match": True,
            "reasons": match_reasons or [],
            "risks_or_gaps": [],
            "ideal_candidate_profile": "",
            "structured_scores": {},
        }
    try:
        # Extract JSON from markdown code block if present
        if "```" in raw:
            parts = raw.split("```")
            for p in parts:
                p = p.strip()
                if p.startswith("json"):
                    p = p[4:].strip()
                if p.startswith("{"):
                    return json.loads(p)
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "is_good_match": True,
            "reasons": [raw[:200]] if raw else match_reasons,
            "risks_or_gaps": [],
            "ideal_candidate_profile": "",
            "structured_scores": {},
        }


def run_judge_agent(compare_output: Dict[str, Any]) -> Dict[str, Any]:
    """
    Judge agent output: status ("pass"|"fail"), feedback.
    """
    compare_str = json.dumps(compare_output, default=str, indent=2)
    user_message = f"""Review this scholarship match analysis. Return JSON:
{{"status": "pass" or "fail", "feedback": "brief explanation"}}

Analysis:
{compare_str}
"""
    if JUDGE_SYSTEM_PROMPT:
        user_message = f"{JUDGE_SYSTEM_PROMPT}\n\n{user_message}"

    raw = _call_llm(JUDGE_SYSTEM_PROMPT or "You are a quality reviewer. Output valid JSON only.", user_message)
    if not raw:
        return {"status": "pass", "feedback": ""}
    try:
        if "```" in raw:
            parts = raw.split("```")
            for p in parts:
                p = p.strip()
                if p.startswith("json"):
                    p = p[4:].strip()
                if p.startswith("{"):
                    return json.loads(p)
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"status": "pass", "feedback": ""}


def run_next_steps_agent(
    user: Dict[str, Any],
    scholarship: Dict[str, Any],
    compare_result: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Next-steps agent output: steps (list of {task, tag}), overall_recommendation.
    """
    user_js = json.dumps(_user_json(user), default=str)
    sch_js = json.dumps(_scholarship_json(scholarship), default=str)
    compare_str = json.dumps(compare_result, default=str)

    user_message = f"""Given this student, scholarship, and match analysis, provide next application steps.
Return JSON:
{{"steps": [{{"task": "...", "tag": "eligibility_check|document_prep|essay|reference|deadline|other"}}], "overall_recommendation": "high priority|medium|low"}}

Student: {user_js}
Scholarship: {sch_js}
Match analysis: {compare_str}
"""
    if NEXT_STEPS_SYSTEM_PROMPT:
        user_message = f"{NEXT_STEPS_SYSTEM_PROMPT}\n\n{user_message}"

    raw = _call_llm(NEXT_STEPS_SYSTEM_PROMPT or "Output valid JSON only.", user_message)
    if not raw:
        return {
            "steps": [
                {"task": "Check eligibility requirements", "tag": "eligibility_check"},
                {"task": "Gather documents (resume, transcript)", "tag": "document_prep"},
                {"task": "Submit before deadline", "tag": "deadline"},
            ],
            "overall_recommendation": "medium",
        }
    try:
        if "```" in raw:
            parts = raw.split("```")
            for p in parts:
                p = p.strip()
                if p.startswith("json"):
                    p = p[4:].strip()
                if p.startswith("{"):
                    return json.loads(p)
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "steps": [{"task": "Review scholarship requirements", "tag": "other"}],
            "overall_recommendation": "medium",
        }


def run_ai_loop(
    user: Dict[str, Any],
    scholarship: Dict[str, Any],
    match_reasons: List[str],
    max_iterations: int = 3,
) -> Dict[str, Any]:
    """
    Compare -> Judge loop until pass or max_iterations, then Next-steps.
    Returns combined result: ai_explanation, next_steps, overall_recommendation.
    """
    compare_result = None
    judge_result = None

    for _ in range(max_iterations):
        judge_feedback = judge_result.get("feedback") if judge_result else None
        compare_result = run_compare_agent(user, scholarship, match_reasons, judge_feedback)
        judge_result = run_judge_agent(compare_result)
        if judge_result.get("status") == "pass":
            break

    next_steps_result = run_next_steps_agent(user, scholarship, compare_result or {})

    reasons = compare_result.get("reasons", match_reasons) if compare_result else match_reasons
    ai_explanation = "; ".join(reasons) if isinstance(reasons, list) else str(reasons)

    return {
        "ai_explanation": ai_explanation,
        "next_steps": next_steps_result.get("steps", []),
        "overall_recommendation": next_steps_result.get("overall_recommendation", "medium"),
    }
