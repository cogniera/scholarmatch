from typing import Any
from mcp.server.fastmcp import FastMCP

# Create the MCP server
mcp = FastMCP("scholarship-tools")


@mcp.tool()
def ping() -> str:
    """Simple health check tool."""
    return "pong"


@mcp.tool()
def calculate_match_score(
    student_gpa: float,
    min_gpa: float,
    program: str,
    scholarship_program: str,
) -> dict[str, Any]:
    """
    Estimate a simple scholarship match score based on GPA and program fit.
    """
    score = 0
    reasons: list[str] = []

    if student_gpa >= min_gpa:
        score += 60
        reasons.append("GPA requirement met")
    else:
        reasons.append("GPA requirement not met")

    if program.strip().lower() == scholarship_program.strip().lower():
        score += 40
        reasons.append("Program matches scholarship preference")
    else:
        reasons.append("Program does not exactly match scholarship preference")

    return {
        "score": score,
        "eligible": student_gpa >= min_gpa,
        "reasons": reasons,
    }


@mcp.tool()
def recommend_next_steps(
    student_name: str,
    has_resume: bool,
    has_transcript: bool,
    has_essay: bool,
) -> dict[str, Any]:
    """
    Return next application-prep steps for a student.
    """
    steps: list[str] = []

    if not has_resume:
        steps.append("Upload or create a resume")
    if not has_transcript:
        steps.append("Upload your transcript")
    if not has_essay:
        steps.append("Draft a personal statement / essay")

    if not steps:
        steps.append("Profile looks complete — start applying")

    return {
        "student_name": student_name,
        "steps": steps,
        "ready_to_apply": has_resume and has_transcript and has_essay,
    }


@mcp.tool()
def normalize_scholarship_json(
    title: str,
    provider: str,
    amount: str,
    deadline: str,
    eligibility: str,
) -> dict[str, Any]:
    """
    Normalize scraped scholarship fields into a consistent JSON object.
    """
    return {
        "title": title.strip(),
        "provider": provider.strip(),
        "amount": amount.strip(),
        "deadline": deadline.strip(),
        "eligibility": eligibility.strip(),
    }


@mcp.tool()
def normalize_profile_json(
    **profile: Any,
) -> dict[str, Any]:
    """
    Take a student profile dictionary (as stored in the database) and return a
    minimal JSON object containing a list of keywords/qualities that describe the
    student.  This mirrors the scholarship normalization above and makes it easy
    for the matching engine or an LLM to compare the two records.

    For simplicity the implementation just picks the `qualities` field if
    present; additional logic could expand program, academic level, financial
    need, etc. into keywords.
    """
    # already structured, just propagate
    return {"qualities": profile.get("qualities", [])}


if __name__ == "__main__":
    # Run over stdio so an MCP client can spawn this process locally
    mcp.run(transport="stdio")