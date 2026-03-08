"""
save_to_supabase.py

Reads scraped_scholarships.json, transforms each entry to match
the Supabase scholarships table schema, and inserts them.

Run after scraper.py:
    python scraper.py      ← scrapes + calls Gemini
    python save_to_supabase.py  ← transforms + saves to Supabase

Supabase scholarships table schema:
    id, title, provider, amount (int), deadline (date),
    eligibility (text), location, program, gpa_requirement (float),
    financial_need_required (bool), academic_level (text), link,
    logo_url (text), image_url (text)
"""

import os
import json
import re
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
INPUT_FILE   = "scraped_scholarships.json"


def parse_amount(amount_str: str) -> int:
    """
    Convert amount string to integer.
    "$25,000" → 25000
    "Varies"  → 0
    "Not specified" → 0
    """
    if not amount_str or not isinstance(amount_str, str):
        return 0
    # Strip everything except digits
    digits = re.sub(r"[^\d]", "", amount_str)
    return int(digits) if digits else 0


def parse_deadline(deadline_str: str):
    """
    Return a valid date string or None.
    "2026-04-01" → "2026-04-01"
    "Not specified" → None
    """
    if not deadline_str or deadline_str.lower() in ("not specified", "varies", "n/a", ""):
        return None
    # If it already looks like YYYY-MM-DD return as-is
    if re.match(r"\d{4}-\d{2}-\d{2}", deadline_str):
        return deadline_str
    return None


def parse_financial_need(keywords: list) -> bool:
    """Return True if 'financial need' appears in eligibility keywords."""
    if not keywords:
        return False
    return any("financial need" in kw.lower() for kw in keywords)


def parse_academic_level(education_levels: list) -> str:
    """Convert array of levels to comma-separated string."""
    if not education_levels:
        return "Undergraduate"
    return ", ".join(education_levels)


def transform(raw: dict) -> dict:
    """Map scraped fields → Supabase schema fields."""
    keywords = raw.get("eligibility_keywords", [])
    eligibility_text = raw.get("description", "")
    if keywords:
        eligibility_text += " Keywords: " + ", ".join(keywords)

    return {
        "title":                  raw.get("name") or "Untitled Scholarship",
        "provider":               raw.get("organization") or "Unknown",
        "amount":                 parse_amount(raw.get("amount", "")),
        "deadline":               parse_deadline(raw.get("deadline", "")),
        "eligibility":            eligibility_text.strip(),
        "location":               "Canada",   # All scraped sources are Canadian
        "program":                "All",      # Scraper doesn't extract program yet
        "gpa_requirement":        0.0,        # Scraper doesn't extract GPA yet
        "financial_need_required": parse_financial_need(keywords),
        "academic_level":         parse_academic_level(raw.get("education_level", [])),
        "link":                   raw.get("application_url") or "",
        "logo_url":               raw.get("logo_url") or "",
        "image_url":              raw.get("image_url") or "",
    }


def save_to_supabase():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Missing SUPABASE_URL or SUPABASE_KEY in .env")
        return

    if not os.path.exists(INPUT_FILE):
        print(f"❌ {INPUT_FILE} not found. Run scraper.py first.")
        return

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        raw_scholarships = json.load(f)

    print(f"📄 Loaded {len(raw_scholarships)} scholarships from {INPUT_FILE}")

    db = create_client(SUPABASE_URL, SUPABASE_KEY)

    inserted = 0
    skipped  = 0

    for raw in raw_scholarships:
        try:
            record = transform(raw)

            # Skip entries with no title
            if not record["title"] or record["title"] == "Untitled Scholarship":
                skipped += 1
                continue

            # Upsert on title + provider to avoid duplicates on re-runs
            db.table("scholarships").upsert(
                record,
                on_conflict="title,provider"
            ).execute()

            inserted += 1
            print(f"  ✅ Saved: {record['title']} ({record['provider']})")

        except Exception as e:
            print(f"  ⚠️  Failed to save '{raw.get('name', 'unknown')}': {e}")
            skipped += 1

    print(f"\n🎉 Done — {inserted} inserted/updated, {skipped} skipped")


if __name__ == "__main__":
    save_to_supabase()