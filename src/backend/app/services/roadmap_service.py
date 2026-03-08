"""
roadmap_service.py — Research agent + roadmap generation from top 3 AI recommendations.

Uses MCP tools (web_search, fetch_page_metadata, check_deadline_status) to research
and build a plan of action, then stores in user_roadmaps table.
"""

from typing import Dict, Any, List
import json
import os

from app.services.mcp_tools import web_search, fetch_page_metadata, check_deadline_status


def _get_model():
    """Lazy init of Gemini model."""
    try:
        import google.generativeai as genai
        key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not key:
            return None
        genai.configure(api_key=key)
        return genai.GenerativeModel("gemini-2.0-flash")
    except Exception:
        return None


def run_research_agent(
    top_scholarships: List[Dict[str, Any]],
    user_profile: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Research agent: uses MCP tools to search the internet, fetch page metadata,
    check deadlines. Returns a structured plan of action (roadmap steps).
    """
    model = _get_model()
    if not model:
        return _fallback_roadmap_steps(top_scholarships, user_profile)

    # Gather research via MCP tools
    research_results = []
    for i, match in enumerate(top_scholarships[:3]):
        sch = match.get("scholarship", match) if isinstance(match.get("scholarship"), dict) else match
        title = sch.get("title", "")
        link = sch.get("link", "")
        deadline = sch.get("deadline")
        next_steps = match.get("next_steps", [])

        # Use MCP tools
        search_result = web_search(f"{title} scholarship application requirements deadline")
        page_result = fetch_page_metadata(link) if link else {}
        deadline_result = check_deadline_status(str(deadline) if deadline else "", link)

        research_results.append({
            "scholarship": title,
            "link": link,
            "search": search_result,
            "page": page_result,
            "deadline": deadline_result,
            "next_steps": next_steps,
        })

    # Build prompt for research agent to synthesize plan
    research_str = json.dumps(research_results, default=str, indent=2)
    user_str = json.dumps({
        "program": user_profile.get("program"),
        "academic_level": user_profile.get("academic_level"),
        "gpa": user_profile.get("gpa"),
    }, default=str)

    prompt = f"""You are a scholarship application research agent. Given research data from web search and page fetches, create a prioritized roadmap of steps for the student.

User profile: {user_str}

Research data (from MCP tools): {research_str}

Return a JSON array of steps, each with: id, title, description, status ("complete"|"in-progress"|"locked"), progress (0-100), unlockValue (dollar amount), unlockCount (number of scholarships).
Order by priority. Base steps on the next_steps from each scholarship and the research. Output valid JSON array only."""

    try:
        response = model.generate_content(prompt, generation_config={"temperature": 0.2})
        if response and response.text:
            raw = response.text.strip()
            if "```" in raw:
                parts = raw.split("```")
                for p in parts:
                    p = p.strip()
                    if p.startswith("json"):
                        p = p[4:].strip()
                    if p.startswith("["):
                        return json.loads(p)
            return json.loads(raw)
    except Exception:
        pass

    return _fallback_roadmap_steps(top_scholarships, user_profile)


def _fallback_roadmap_steps(
    top_scholarships: List[Dict[str, Any]],
    user_profile: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """Fallback when AI unavailable: build steps from next_steps of top 3."""
    steps = []
    seen = set()
    total_value = sum(
        s.get("scholarship", {}).get("amount", 0) or 0
        for s in top_scholarships[:3]
        if isinstance(s.get("scholarship"), dict)
    )
    for i, match in enumerate(top_scholarships[:3]):
        sch = match.get("scholarship", {}) if isinstance(match.get("scholarship"), dict) else {}
        next_steps = match.get("next_steps", [])
        for j, ns in enumerate(next_steps):
            task = ns.get("task", str(ns)) if isinstance(ns, dict) else str(ns)
            key = task.lower()[:50]
            if key not in seen:
                seen.add(key)
                steps.append({
                    "id": len(steps) + 1,
                    "title": task,
                    "description": f"From {sch.get('title', 'recommendation')}",
                    "status": "in-progress" if len(steps) < 2 else "locked",
                    "progress": 25 if len(steps) < 2 else 0,
                    "unlockValue": int(total_value * 0.2) if total_value else 0,
                    "unlockCount": len(top_scholarships[:3]),
                })
    if not steps:
        steps = [
            {"id": 1, "title": "Check eligibility requirements", "description": "Verify you meet all criteria", "status": "in-progress", "progress": 25, "unlockValue": 0, "unlockCount": 0},
            {"id": 2, "title": "Gather documents", "description": "Resume, transcript, essays", "status": "locked", "progress": 0, "unlockValue": 0, "unlockCount": 0},
            {"id": 3, "title": "Submit before deadline", "description": "Complete applications on time", "status": "locked", "progress": 0, "unlockValue": 0, "unlockCount": 0},
        ]
    return steps
