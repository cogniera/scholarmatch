"""
services/matching.py — Scholarship matching engine

Scoring logic:
  +2  program match
  +2  GPA meets requirement
  +1  location match
  +1  academic level match
  +1  financial need match

Min score to include in results: 2
"""

from typing import List, Dict, Any


MINIMUM_SCORE = 2


def match_scholarships(
    user: Dict[str, Any],
    scholarships: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Filter and score scholarships against a student profile.
    Returns list sorted by match_score descending.
    """
    results = []

    user_program = (user.get("program") or "").lower()
    user_location = (user.get("location") or "").lower()
    user_level = (user.get("academic_level") or "").lower()
    user_gpa = float(user.get("gpa") or 0)
    user_need = bool(user.get("financial_need"))

    for s in scholarships:
        score = 0
        reasons = []

        # ── Program match ──────────────────────────────────────────────────
        s_program = (s.get("program") or "").lower()
        if s_program == "all" or user_program in s_program:
            score += 2
            reasons.append(f"Your program ({user.get('program')}) matches")

        # ── GPA requirement ────────────────────────────────────────────────
        gpa_req = float(s.get("gpa_requirement") or 0)
        if user_gpa >= gpa_req:
            score += 2
            if gpa_req > 0:
                reasons.append(f"Your GPA ({user_gpa}) meets the {gpa_req} requirement")
            else:
                reasons.append("No minimum GPA required")

        # ── Location match ─────────────────────────────────────────────────
        s_location = (s.get("location") or "").lower()
        if s_location in ("canada", "all") or user_location in s_location or s_location in user_location:
            score += 1
            reasons.append(f"Available in your region ({user.get('location')})")

        # ── Academic level ─────────────────────────────────────────────────
        s_level = (s.get("academic_level") or "").lower()
        if "all" in s_level or user_level in s_level:
            score += 1
            reasons.append(f"Open to {user.get('academic_level')} students")

        # ── Financial need ─────────────────────────────────────────────────
        s_need = bool(s.get("financial_need_required"))
        if s_need and user_need:
            score += 1
            reasons.append("Matches your financial need eligibility")
        elif not s_need:
            pass  # No penalty — scholarship is open to all

        if score >= MINIMUM_SCORE:
            results.append({
                "scholarship": s,
                "match_score": score,
                "match_reasons": reasons,   # Used by Gemini for richer explanations
                "ai_explanation": None,     # Filled in by Gemini later
            })

    # Sort by score descending
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results
