"""
mcp_tools.py — Tool implementations for the next-steps agent.

Same logic as MCP server tools; callable from the backend for Gemini function-calling.
Wire via Google AI tool declarations when invoking the next-steps agent.
"""

from typing import Any
from datetime import date, datetime


def web_search(query: str) -> dict[str, Any]:
    """
    General web search. Stub: enhance with Google Custom Search or similar.
    """
    return {
        "query": query,
        "status": "stub",
        "message": "Web search not configured.",
        "results": [],
    }


def fetch_page_metadata(url: str) -> dict[str, Any]:
    """
    Pull title, meta description, headings from a URL. Stub: enhance with requests/bs4.
    """
    return {
        "url": url,
        "status": "stub",
        "message": "Page fetch not configured.",
        "title": "",
        "description": "",
        "headings": [],
    }


def check_deadline_status(deadline: str, url: str = "") -> dict[str, Any]:
    """Check if deadline is in the future and days remaining."""
    today = date.today()
    days_remaining = None
    is_future = None
    parsed_date = None

    if deadline:
        try:
            if isinstance(deadline, str):
                parsed_date = datetime.fromisoformat(deadline.replace("Z", "+00:00")).date()
            elif hasattr(deadline, "isoformat"):
                parsed_date = deadline
            if parsed_date:
                delta = parsed_date - today
                days_remaining = delta.days
                is_future = days_remaining > 0
        except Exception:
            pass

    return {
        "deadline": str(deadline) if deadline else "",
        "url": url or "",
        "is_future": is_future if is_future is not None else "unknown",
        "days_remaining": days_remaining,
        "parsed_date": str(parsed_date) if parsed_date else None,
    }


# Map for Gemini function calling: name -> (func, schema)
TOOL_DECLARATIONS = [
    {
        "name": "web_search",
        "description": "General web search to confirm deadlines or find official scholarship pages.",
        "parameters": {
            "type": "object",
            "properties": {"query": {"type": "string", "description": "Search query"}},
            "required": ["query"],
        },
    },
    {
        "name": "fetch_page_metadata",
        "description": "Fetch title, meta description, and headings from a scholarship URL.",
        "parameters": {
            "type": "object",
            "properties": {"url": {"type": "string", "description": "URL to fetch"}},
            "required": ["url"],
        },
    },
    {
        "name": "check_deadline_status",
        "description": "Check if a scholarship deadline is in the future and days remaining.",
        "parameters": {
            "type": "object",
            "properties": {
                "deadline": {"type": "string", "description": "Deadline date (ISO format)"},
                "url": {"type": "string", "description": "Optional scholarship URL"},
            },
            "required": ["deadline"],
        },
    },
]

TOOL_FUNCTIONS = {
    "web_search": web_search,
    "fetch_page_metadata": fetch_page_metadata,
    "check_deadline_status": check_deadline_status,
}
