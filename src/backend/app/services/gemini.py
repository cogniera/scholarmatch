from typing import Optional, Dict, Any, List
import json
import os
import asyncio

from app.services.ai_search import run_ai_loop


BACKBOARD_API_KEY = os.getenv("BACKBOARD_API_KEY")
BACKBOARD_ASSISTANT_ID = os.getenv("BACKBOARD_ASSISTANT_ID")
BACKBOARD_ENABLED = bool(BACKBOARD_API_KEY and BACKBOARD_ASSISTANT_ID)
_backboard_client = None
_backboard_threads: Dict[str, str] = {}


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


def _fallback_chat(question: str, scholarships_summary: Optional[List[dict]] = None) -> Dict[str, Any]:
    """
    Keyword-based fallback when Gemini is unavailable. Handles organize requests,
    basic scholarship questions, and common queries.
    """
    q = question.lower().strip()
    organize = None
    response = ""
    sch_list = scholarships_summary or []

    def _amt(s):
        a = s.get("amount") if isinstance(s, dict) else None
        if a is None:
            return 0
        try:
            return float(a)
        except (TypeError, ValueError):
            return 0

    def _deadline(s):
        d = s.get("deadline") if isinstance(s, dict) else None
        return d

    def _title(s):
        return (s.get("title") or s.get("name") or "—") if isinstance(s, dict) else "—"

    # ── Basic scholarship questions (need data) ──
    if sch_list:
        # How many scholarships?
        if any(w in q for w in ["how many", "how many scholarships", "count", "number of", "total scholarships"]):
            n = len(sch_list)
            response = f"You have {n} matched scholarship{n if n != 1 else ''} on your dashboard."
        # Highest / biggest amount
        elif any(w in q for w in ["highest amount", "biggest", "most money", "top scholarship", "largest award"]):
            by_amt = sorted(sch_list, key=_amt, reverse=True)
            top = by_amt[0] if by_amt else None
            if top and _amt(top) > 0:
                response = f"Your highest scholarship is {_title(top)} at ${_amt(top):,.0f}."
            else:
                response = "I don't have amount details for your scholarships right now."
        # Next deadline / soonest
        elif any(w in q for w in ["next deadline", "soonest", "when is", "upcoming", "due soon", "earliest deadline"]):
            with_dates = [(s, _deadline(s)) for s in sch_list if _deadline(s)]
            with_dates.sort(key=lambda x: (str(x[1]) if x[1] else "9999-12-31"))
            if with_dates:
                s, d = with_dates[0]
                response = f"Your soonest deadline is {_title(s)} — due {str(d)[:10]}."
            else:
                response = "I don't have deadline info for your scholarships right now."
        # Total value
        elif any(w in q for w in ["total value", "total amount", "how much total", "sum of", "combined"]):
            total = sum(_amt(s) for s in sch_list)
            if total > 0:
                response = f"The total value of your matched scholarships is ${total:,.0f}."
            else:
                response = "I don't have amount details to add up right now."
        # What are my scholarships / list top
        elif any(w in q for w in ["what are my", "list my", "name my", "top 3", "my scholarships"]):
            top3 = sch_list[:3]
            names = [f"• {_title(s)}" for s in top3]
            if names:
                response = "Here are your top matches:\n" + "\n".join(names)
            else:
                response = "You have scholarships matched — check the dashboard for details."
        # Organize intents (same as before)
        elif any(w in q for w in ["sort by deadline", "by deadline", "deadline first", "soonest first", "upcoming first"]):
            organize = {"sortBy": "deadline", "order": "asc"}
            response = "I've organized your scholarships by deadline — soonest first."
        elif any(w in q for w in ["highest amount first", "most money first", "biggest award first", "sort by amount", "amount first", "by amount"]):
            organize = {"sortBy": "amount", "order": "desc"}
            response = "I've sorted your scholarships by amount — highest awards first."
        elif any(w in q for w in ["best match", "match score", "sort by match", "top match", "highest match"]):
            organize = {"sortBy": "matchScore", "order": "desc"}
            response = "I've sorted your scholarships by match score — best matches first."
        elif any(w in q for w in ["$5000", "5000+", "over 5000", "at least 5000", "minimum 5000"]):
            organize = {"filterMinAmount": 5000}
            response = "Showing scholarships of $5,000 or more."
        elif any(w in q for w in ["$10000", "10000+", "over 10000", "10k+"]):
            organize = {"filterMinAmount": 10000}
            response = "Showing scholarships of $10,000 or more."
        elif any(w in q for w in ["$1000", "1000+", "over 1000"]):
            organize = {"filterMinAmount": 1000}
            response = "Showing scholarships of $1,000 or more."
        elif any(w in q for w in ["80%", "80 percent", "80%+", "above 80"]):
            organize = {"filterMinMatch": 80}
            response = "Showing scholarships with 80% match or higher."
        elif any(w in q for w in ["90%", "90 percent", "90%+", "above 90"]):
            organize = {"filterMinMatch": 90}
            response = "Showing scholarships with 90% match or higher."
        elif any(w in q for w in ["60%", "60 percent", "60%+", "above 60"]):
            organize = {"filterMinMatch": 60}
            response = "Showing scholarships with 60% match or higher."
        else:
            response = "I can sort or filter your scholarships — try \"sort by deadline\" or \"show highest amount first.\" Or ask \"how many scholarships do I have?\""
    else:
        # No scholarship data — organize/help only
        if any(w in q for w in ["sort by deadline", "by deadline", "deadline first", "soonest", "upcoming first"]):
            organize = {"sortBy": "deadline", "order": "asc"}
            response = "I've organized your scholarships by deadline — soonest first."
        elif any(w in q for w in ["highest amount", "most money", "biggest award", "sort by amount", "amount first", "by amount"]):
            organize = {"sortBy": "amount", "order": "desc"}
            response = "I've sorted your scholarships by amount — highest awards first."
        elif any(w in q for w in ["best match", "match score", "sort by match", "top match", "highest match"]):
            organize = {"sortBy": "matchScore", "order": "desc"}
            response = "I've sorted your scholarships by match score — best matches first."
        elif any(w in q for w in ["$5000", "5000+", "over 5000"]):
            organize = {"filterMinAmount": 5000}
            response = "Showing scholarships of $5,000 or more."
        elif any(w in q for w in ["$10000", "10000+", "10k+"]):
            organize = {"filterMinAmount": 10000}
            response = "Showing scholarships of $10,000 or more."
        elif any(w in q for w in ["$1000", "1000+", "over 1000"]):
            organize = {"filterMinAmount": 1000}
            response = "Showing scholarships of $1,000 or more."
        elif any(w in q for w in ["80%", "80%+", "above 80"]):
            organize = {"filterMinMatch": 80}
            response = "Showing scholarships with 80% match or higher."
        elif any(w in q for w in ["90%", "90%+", "above 90"]):
            organize = {"filterMinMatch": 90}
            response = "Showing scholarships with 90% match or higher."
        elif any(w in q for w in ["60%", "60%+", "above 60"]):
            organize = {"filterMinMatch": 60}
            response = "Showing scholarships with 60% match or higher."
        elif any(w in q for w in ["help", "what can you do", "how does this work"]):
            response = "I can help you organize your scholarships and answer basic questions! Try:\n• \"How many scholarships do I have?\"\n• \"What's my highest scholarship?\"\n• \"Sort by deadline\" or \"Show highest amount first\""
        elif any(w in q for w in ["hello", "hi", "hey"]):
            response = "Hi! Ask me about your scholarships — \"how many?\", \"what's my highest?\", or \"sort by deadline.\""
        else:
            response = "I can sort or filter your scholarships, or answer questions like \"how many scholarships do I have?\" and \"what's my highest?\" Say \"help\" for more."

    return {"response": response, "organize": organize}


def _get_backboard_client():
    global _backboard_client
    if not BACKBOARD_ENABLED:
        return None
    if _backboard_client is not None:
        return _backboard_client
    try:
        from backboard import BackboardClient  # type: ignore[import]
    except Exception:
        return None
    _backboard_client = BackboardClient(api_key=BACKBOARD_API_KEY)
    return _backboard_client


async def _backboard_chat_async(
    question: str,
    user: dict,
    scholarships_summary: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """
    Use Backboard threads + memory for the right-side dashboard chatbot only.

    Each user id maps to a Backboard thread so memory persists across messages
    and sessions (for as long as this process is running).
    """
    client = _get_backboard_client()
    if client is None:
        return _fallback_chat(question, scholarships_summary)

    user_id = str(user.get("id") or user.get("auth0_sub") or "anonymous")
    thread_id = _backboard_threads.get(user_id)
    if not thread_id:
        thread = await client.create_thread(BACKBOARD_ASSISTANT_ID)
        thread_id = thread.thread_id
        _backboard_threads[user_id] = thread_id

    # Build content with scholarships summary so the assistant can reference them.
    content_parts = [f"User question: {question}"]
    if scholarships_summary:
        content_parts.append(
            "Current scholarships on the dashboard (JSON summary): "
            + json.dumps(scholarships_summary[:30], default=str)
        )

    # Include lightweight instructions so Backboard knows about ORGANIZE_JSON.
    instructions = (
        "You are the ScholarMatch dashboard assistant. You help students with "
        "their scholarships and can also instruct the UI to change how "
        "scholarships are displayed.\n\n"
        "When the user wants to change how scholarships are displayed "
        "(sorting or filtering), append a line with:\n\n"
        "ORGANIZE_JSON:\n"
        '{"sortBy":"deadline"|"amount"|"matchScore","order":"asc"|"desc",'
        '"filterMinAmount":number|null,"filterMinMatch":number|null}\n\n'
        "Examples: \"sort by deadline\" -> {\"sortBy\":\"deadline\",\"order\":\"asc\"}; "
        "\"highest amount\" -> {\"sortBy\":\"amount\",\"order\":\"desc\"}; "
        "\"only $5000+\" -> {\"filterMinAmount\":5000}.\n\n"
        "Otherwise, do not include ORGANIZE_JSON and just answer naturally."
    )

    full_content = instructions + "\n\n" + "\n".join(content_parts)

    response = await client.add_message(
        thread_id=thread_id,
        content=full_content,
        memory="Auto",  # enable Backboard memory
        stream=False,
    )

    text = (getattr(response, "content", "") or "").strip()
    if not text:
        return _fallback_chat(question, scholarships_summary)

    organize = None
    if "ORGANIZE_JSON:" in text:
        try:
            base, after = text.split("ORGANIZE_JSON:", 1)
            json_part = after.strip()
            end = json_part.find("\n")
            if end > 0:
                json_part = json_part[:end]
            parsed = json.loads(json_part)
            allowed = {"sortBy", "order", "filterMinAmount", "filterMinMatch"}
            organize = {k: v for k, v in parsed.items() if k in allowed and v is not None}
            text = base.strip()
        except Exception:
            pass

    return {"response": text or "I couldn't generate a response. Please try again.", "organize": organize}


def _backboard_chat(
    question: str,
    user: dict,
    scholarships_summary: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """
    Synchronous wrapper for Backboard chat so it can be called from
    regular FastAPI (threadpool) endpoints.
    """
    return asyncio.run(_backboard_chat_async(question, user, scholarships_summary))


def application_chat(
    question: str,
    user: dict,
    scholarship=None,
    resume_text=None,
    scholarships_summary: Optional[List[dict]] = None,
) -> Dict[str, Any]:
    """
    AI-powered scholarship assistant. Returns { response, organize? }.
    Uses (in priority order):
      1. Backboard memory chat if BACKBOARD_* env vars are configured
      2. Gemini model if GOOGLE_API_KEY / GEMINI_API_KEY is configured
      3. Keyword-based fallback so chat always works
    """
    # 1) Backboard with persistent memory across sessions (chatbot only).
    if BACKBOARD_ENABLED:
        try:
            return _backboard_chat(question, user, scholarships_summary)
        except Exception:
            # If Backboard fails for any reason, fall through to Gemini / fallback.
            pass

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

    return _fallback_chat(question, scholarships_summary)


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