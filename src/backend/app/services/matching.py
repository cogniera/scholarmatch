"""
services/matching.py — Scholarship matching engine

Pipeline:
1. Deterministic eligibility filter (hard filter) — ineligible scholarships are discarded.
2. Points-based scoring — component scores (gpa, need, program, location, deadline) weighted.
3. Embedding-based semantic similarity — qualities fit (fallback to text overlap when no embeddings).
4. Final score = alpha * base_score + (1 - alpha) * embedding_score.

Returns list sorted by final_numeric_score descending, ready for AI loop (top 10).
"""

from typing import List, Dict, Any, Optional, Tuple
import re


# Scoring weights (tunable via config; plan example)
WEIGHT_GPA = 0.4
WEIGHT_NEED = 0.25
WEIGHT_PROGRAM = 0.2
WEIGHT_LOCATION = 0.1
WEIGHT_DEADLINE = 0.05
ALPHA_BASE_VS_EMBEDDING = 0.6

# Canonical academic level mappings for eligibility
LEVEL_ALIASES = {
    "high school": ["highschool", "high school", "high_school", "hs"],
    "undergraduate": ["undergrad", "undergraduate", "bachelor", "bachelors", "bs", "ba"],
    "graduate": ["grad", "graduate", "masters", "ms", "ma", "mba"],
    "phd": ["phd", "doctorate", "doctoral"],
}


def _to_lower_str(value: Any) -> str:
    """Normalize unknown input to a trimmed lowercase string."""
    return str(value).strip().lower() if value is not None else ""


def _to_optional_float(value: Any) -> Optional[float]:
    """Parse numeric-like values safely; return None when absent/invalid."""
    if value is None:
        return None
    text = str(value).strip()
    if text == "":
        return None
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def _canonical_level(level: str) -> str:
    """Map various level strings to a canonical form for comparison."""
    level = _to_lower_str(level)
    if not level:
        return ""
    for canonical, aliases in LEVEL_ALIASES.items():
        if level in aliases or any(a in level for a in aliases):
            return canonical
    return level


def _eligible_academic_level(s_levels: Any, user_level: str) -> bool:
    """
    Check if user academic level is eligible for the scholarship.
    Uses eligible_academic_levels if present, else falls back to academic_level.
    """
    user_canon = _canonical_level(user_level)
    if not user_canon:
        return True  # No user level constraint — allow

    # New schema: eligible_academic_levels array
    if isinstance(s_levels, list) and s_levels:
        s_lower = [str(x).strip().lower() for x in s_levels]
        user_lower = user_level.strip().lower()
        for s in s_lower:
            if "all" in s or user_lower in s or user_canon in s:
                return True
            for canonical, aliases in LEVEL_ALIASES.items():
                if s in aliases and user_canon == canonical:
                    return True
        return False

    return True  # No level constraint on scholarship


def _check_eligibility(
    user: Dict[str, Any],
    scholarship: Dict[str, Any],
) -> Tuple[bool, str]:
    """
    Deterministic eligibility filter.
    Returns (passed, reason). If not passed, reason explains first failure.
    """
    user_gpa = _to_optional_float(user.get("gpa"))
    user_level = _to_lower_str(user.get("academic_level"))
    user_location = _to_lower_str(user.get("location"))
    user_program = _to_lower_str(user.get("program"))
    user_need = bool(user.get("financial_need"))

    # GPA: use min_gpa if present, else gpa_requirement
    min_gpa = _to_optional_float(scholarship.get("min_gpa")) or _to_optional_float(
        scholarship.get("gpa_requirement")
    )
    if min_gpa is not None and user_gpa is not None and user_gpa < min_gpa:
        return False, f"GPA requirement not met: need {min_gpa}, you have {user_gpa}"

    max_gpa = _to_optional_float(scholarship.get("max_gpa"))
    if max_gpa is not None and user_gpa is not None and user_gpa > max_gpa:
        return False, f"GPA exceeds maximum: max {max_gpa}, you have {user_gpa}"

    # Need-based: if scholarship requires financial need, user must have it
    is_need_based = scholarship.get("is_need_based")
    if is_need_based is None:
        is_need_based = bool(scholarship.get("financial_need_required"))
    if is_need_based and not user_need:
        return False, "Scholarship is need-based; you did not indicate financial need"

    # Academic level
    s_levels = scholarship.get("eligible_academic_levels")
    s_legacy_level = _to_lower_str(scholarship.get("academic_level"))
    if s_levels or s_legacy_level:
        if s_levels:
            ok = _eligible_academic_level(s_levels, user_level)
        else:
            ok = (
                "all" in s_legacy_level
                or (user_level and (user_level in s_legacy_level or s_legacy_level in user_level))
            )
        if not ok:
            return False, f"Academic level mismatch: scholarship targets {s_levels or s_legacy_level}, you are {user_level or 'unspecified'}"

    # Location: use eligible_locations if present, else location
    s_locations = scholarship.get("eligible_locations")
    s_loc = _to_lower_str(scholarship.get("location"))
    if s_locations or s_loc:
        if s_locations:
            user_loc = user_location or ""
            ok = any(
                "all" in str(l).lower() or user_loc.lower() in str(l).lower() or str(l).lower() in user_loc.lower()
                for l in s_locations
            )
        else:
            ok = s_loc == "all" or (
                user_location
                and s_loc
                and (user_location in s_loc or s_loc in user_location)
            )
        if not ok:
            return False, f"Location mismatch: scholarship for {s_locations or s_loc}, you are in {user_location or 'unspecified'}"

    return True, "Eligible"


def _gpa_score(user_gpa: Optional[float], min_gpa: Optional[float], max_gpa: Optional[float]) -> float:
    """Score 0..1: how much user exceeds minimum (and stays within max)."""
    if min_gpa is None:
        return 1.0
    if user_gpa is None or user_gpa < min_gpa:
        return 0.0
    if max_gpa is not None and user_gpa > max_gpa:
        return 0.0
    # 0 at min, 1 at min+1 or higher (cap at 1)
    excess = min(1.0, (user_gpa - min_gpa))
    return 0.5 + 0.5 * excess


def _need_score(s_is_need: bool, user_need: bool) -> float:
    """1 if need-based and user has need; 0.5 if not need-based (no penalty)."""
    if not s_is_need:
        return 0.5  # Open to all — neutral
    return 1.0 if user_need else 0.0


def _program_score(user_program: str, s_program: str, s_programs: Optional[List]) -> float:
    """1 exact, 0.7 same category, 0 unrelated."""
    user_p = _to_lower_str(user_program)
    s_p = _to_lower_str(s_program)
    if s_programs and isinstance(s_programs, list):
        for p in s_programs:
            if "all" in str(p).lower():
                return 1.0
            if user_p and (user_p in str(p).lower() or str(p).lower() in user_p):
                return 0.7 if user_p != str(p).lower() else 1.0
        return 0.0
    if s_p == "all" or not s_p:
        return 1.0
    if not user_p:
        return 0.0
    if user_p == s_p or user_p in s_p or s_p in user_p:
        return 0.7 if user_p != s_p else 1.0
    return 0.0


def _location_score(
    user_location: str,
    s_location: str,
    s_locations: Optional[List],
) -> float:
    """1 exact, 0.5 broader, 0 outside."""
    user_loc = _to_lower_str(user_location)
    s_loc = _to_lower_str(s_location)
    if s_locations and isinstance(s_locations, list):
        for loc in s_locations:
            if "all" in str(loc).lower():
                return 1.0
            if user_loc and (user_loc in str(loc).lower() or str(loc).lower() in user_loc):
                return 0.5 if user_loc != str(loc).lower() else 1.0
        return 0.0
    if s_loc == "all" or not s_loc:
        return 1.0
    if not user_loc:
        return 0.0
    if user_loc == s_loc or user_loc in s_loc or s_loc in user_loc:
        return 0.5 if user_loc != s_loc else 1.0
    return 0.0


def _deadline_score(deadline: Any) -> float:
    """1 if far future, lower if soon. Treat None as 1."""
    if deadline is None:
        return 1.0
    try:
        from datetime import date, datetime
        d = deadline
        if hasattr(d, "isoformat"):
            pass
        else:
            d = datetime.fromisoformat(str(d).replace("Z", "+00:00")).date()
        today = date.today()
        days = (d - today).days
        if days < 0:
            return 0.0
        if days >= 90:
            return 1.0
        if days >= 30:
            return 0.7
        if days >= 7:
            return 0.5
        return 0.3
    except Exception:
        return 1.0


def _text_to_bow(text: str) -> Dict[str, int]:
    """Simple bag-of-words from text (words >= 2 chars)."""
    words = re.findall(r"[a-z0-9]{2,}", str(text or "").lower())
    bow: Dict[str, int] = {}
    for w in words:
        bow[w] = bow.get(w, 0) + 1
    return bow


def _cosine_similarity_bow(bow_a: Dict[str, int], bow_b: Dict[str, int]) -> float:
    """Cosine similarity between two bags of words."""
    if not bow_a or not bow_b:
        return 0.0
    all_keys = set(bow_a) | set(bow_b)
    dot = sum(bow_a.get(k, 0) * bow_b.get(k, 0) for k in all_keys)
    mag_a = sum(v * v for v in bow_a.values()) ** 0.5
    mag_b = sum(v * v for v in bow_b.values()) ** 0.5
    if mag_a == 0 or mag_b == 0:
        return 0.0
    sim = dot / (mag_a * mag_b)
    return max(0.0, min(1.0, sim))


def _embedding_similarity(
    user: Dict[str, Any],
    scholarship: Dict[str, Any],
) -> float:
    """
    Compute qualities similarity.
    If both have qualities_embedding (list/vector), use cosine (numpy-style).
    Else fallback to bag-of-words on qualities text.
    """
    user_emb = user.get("qualities_embedding")
    s_emb = scholarship.get("qualities_embedding")

    if user_emb is not None and s_emb is not None:
        try:
            a = list(user_emb) if not isinstance(user_emb, list) else user_emb
            b = list(s_emb) if not isinstance(s_emb, list) else s_emb
            if len(a) != len(b) or len(a) == 0:
                return 0.0
            dot = sum(x * y for x, y in zip(a, b))
            mag_a = sum(x * x for x in a) ** 0.5
            mag_b = sum(x * x for x in b) ** 0.5
            if mag_a == 0 or mag_b == 0:
                return 0.0
            return max(0.0, min(1.0, dot / (mag_a * mag_b)))
        except Exception:
            pass

    # Fallback: bag-of-words on qualities text
    user_text = " ".join(
        filter(
            None,
            [
                str(user.get("extracurriculars") or ""),
                str(user.get("career_interests") or ""),
                str(user.get("profile_summary") or ""),
                str(user.get("academic_level") or ""),
                str(user.get("program") or ""),
            ],
        )
    )
    s_text = " ".join(
        filter(
            None,
            [
                str(scholarship.get("qualities_required") or ""),
                str(scholarship.get("eligibility") or ""),
                str(scholarship.get("academic_level") or ""),
                str(scholarship.get("program") or ""),
            ],
        )
    )
    bow_user = _text_to_bow(user_text)
    bow_s = _text_to_bow(s_text)
    return _cosine_similarity_bow(bow_user, bow_s)


def match_scholarships(
    user: Dict[str, Any],
    scholarships: List[Dict[str, Any]],
    *,
    weights: Optional[Dict[str, float]] = None,
    alpha: Optional[float] = None,
    top_n: int = 50,
) -> List[Dict[str, Any]]:
    """
    Full pipeline: eligibility filter, points-based scoring, embedding similarity.
    Returns list sorted by final_numeric_score descending (0–100 scale for display).
    """
    w_gpa = (weights or {}).get("gpa", WEIGHT_GPA)
    w_need = (weights or {}).get("need", WEIGHT_NEED)
    w_program = (weights or {}).get("program", WEIGHT_PROGRAM)
    w_location = (weights or {}).get("location", WEIGHT_LOCATION)
    w_deadline = (weights or {}).get("deadline", WEIGHT_DEADLINE)
    alpha_val = alpha if alpha is not None else ALPHA_BASE_VS_EMBEDDING

    user_gpa = _to_optional_float(user.get("gpa"))
    user_program = _to_lower_str(user.get("program"))
    user_location = _to_lower_str(user.get("location"))
    user_need = bool(user.get("financial_need"))

    results: List[Dict[str, Any]] = []

    for s in scholarships:
        passed, reason = _check_eligibility(user, s)
        if not passed:
            continue

        min_gpa = _to_optional_float(s.get("min_gpa")) or _to_optional_float(s.get("gpa_requirement"))
        max_gpa = _to_optional_float(s.get("max_gpa"))
        is_need = s.get("is_need_based")
        if is_need is None:
            is_need = bool(s.get("financial_need_required"))

        gpa_s = _gpa_score(user_gpa, min_gpa, max_gpa)
        need_s = _need_score(is_need, user_need)
        program_s = _program_score(
            user_program,
            str(s.get("program") or ""),
            s.get("eligible_programs"),
        )
        location_s = _location_score(
            user_location,
            str(s.get("location") or ""),
            s.get("eligible_locations"),
        )
        deadline_s = _deadline_score(s.get("deadline"))

        base_score = (
            w_gpa * gpa_s
            + w_need * need_s
            + w_program * program_s
            + w_location * location_s
            + w_deadline * deadline_s
        )

        emb_score = _embedding_similarity(user, s)
        final_score = alpha_val * base_score + (1 - alpha_val) * emb_score

        score_components = {
            "gpa": gpa_s,
            "need": need_s,
            "program": program_s,
            "location": location_s,
            "deadline": deadline_s,
        }

        reasons = []
        if gpa_s > 0:
            reasons.append(f"GPA meets requirement ({user_gpa})")
        if need_s > 0:
            reasons.append("Financial need eligibility matches")
        if program_s > 0:
            reasons.append(f"Program fit ({user.get('program')})")
        if location_s > 0:
            reasons.append(f"Location fit ({user.get('location')})")

        results.append({
            "scholarship": s,
            "match_score": round(final_score * 100, 2),  # 0–100 for display
            "base_score": base_score,
            "embedding_score": emb_score,
            "score_components": score_components,
            "eligibility_pass": True,
            "eligibility_reason": reason,
            "match_reasons": reasons,
            "ai_explanation": None,
        })

    results.sort(key=lambda x: (x["match_score"], x["embedding_score"]), reverse=True)
    return results[:top_n]
