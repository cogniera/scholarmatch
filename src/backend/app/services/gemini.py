"""
services/gemini.py — Google Gemini integration

Handles:
  1. Scholarship match explanations
  2. RAG-based application assistant chatbot
"""

import os
from google import genai
from typing import Optional

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


# ── Match Explanation ──────────────────────────────────────────────────────────

def explain_match(user: dict, scholarship: dict, match_reasons: list) -> str:
    """
    Ask Gemini to explain WHY a scholarship matches a student.
    Returns a short, friendly bullet-point explanation.
    """
    prompt = f"""
You are a helpful scholarship advisor. A student has been matched with a scholarship.
Explain clearly and concisely why this student is a good fit.

Student Profile:
- Name: {user.get('name')}
- Program: {user.get('program')}
- GPA: {user.get('gpa')}
- Location: {user.get('location')}
- Academic Level: {user.get('academic_level')}
- Financial Need: {"Yes" if user.get('financial_need') else "No"}
- Extracurriculars: {user.get('extracurriculars') or "Not provided"}

Scholarship:
- Title: {scholarship.get('title')}
- Provider: {scholarship.get('provider')}
- Amount: ${scholarship.get('amount')}
- Eligibility: {scholarship.get('eligibility')}
- GPA Required: {scholarship.get('gpa_requirement')}
- Deadline: {scholarship.get('deadline')}

System match reasons: {", ".join(match_reasons)}

Write 3-4 bullet points explaining why this student is a strong match.
Be encouraging and specific. Keep it under 100 words total.
"""
    response = model.generate_content(prompt)
    return response.text.strip()


# ── Application Assistant (RAG Chatbot) ────────────────────────────────────────

def application_chat(
    question: str,
    user: dict,
    scholarship: Optional[dict] = None,
    resume_text: Optional[str] = None,
) -> str:
    """
    RAG chatbot for scholarship application help.
    Injects student profile + scholarship details + resume as context.
    """

    context_parts = []

    # Student profile context
    context_parts.append(f"""
Student Profile:
- Name: {user.get('name')}
- Program: {user.get('program')}
- GPA: {user.get('gpa')}
- Location: {user.get('location')}
- Academic Level: {user.get('academic_level')}
- Extracurriculars: {user.get('extracurriculars') or "Not provided"}
- Financial Need: {"Yes" if user.get('financial_need') else "No"}
""")

    # Scholarship context (if provided)
    if scholarship:
        context_parts.append(f"""
Target Scholarship:
- Title: {scholarship.get('title')}
- Provider: {scholarship.get('provider')}
- Amount: ${scholarship.get('amount')}
- Eligibility: {scholarship.get('eligibility')}
- Deadline: {scholarship.get('deadline')}
- Link: {scholarship.get('link')}
""")

    # Resume context (if uploaded)
    if resume_text:
        context_parts.append(f"""
Student Resume Summary:
{resume_text[:2000]}  
""")

    context = "\n".join(context_parts)

    prompt = f"""
You are ScholarMatch AI — a friendly, expert scholarship advisor.
Use the student's profile and scholarship details below to give personalized, 
actionable advice. Be concise, warm, and specific.

{context}

Student's Question: {question}

Answer helpfully. If asked for an essay, write a draft.
If asked about eligibility, check the profile against requirements.
If asked for next steps, give a numbered checklist.
"""

    response = model.generate_content(prompt)
    return response.text.strip()


# ── Scholarship Readiness Score ────────────────────────────────────────────────

def readiness_score(user: dict, scholarship: dict) -> dict:
    """
    Generates an AI readiness score and improvement tips for a scholarship.
    Returns: { score: int (0-100), tips: list[str] }
    """
    prompt = f"""
You are a scholarship evaluator. Rate how ready this student is to apply for this scholarship.

Student Profile:
- GPA: {user.get('gpa')}
- Program: {user.get('program')}
- Extracurriculars: {user.get('extracurriculars') or "None listed"}
- Financial Need: {"Yes" if user.get('financial_need') else "No"}
- Academic Level: {user.get('academic_level')}

Scholarship: {scholarship.get('title')}
Requirements: {scholarship.get('eligibility')}

Respond in this EXACT JSON format (no markdown):
{{
  "score": <integer 0-100>,
  "summary": "<one sentence>",
  "tips": ["<tip 1>", "<tip 2>", "<tip 3>"]
}}
"""
    response = model.generate_content(prompt)
    text = response.text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]

    import json
    try:
        return json.loads(text)
    except Exception:
        return {
            "score": 70,
            "summary": "Unable to generate score at this time.",
            "tips": ["Improve your extracurriculars", "Request a strong reference letter", "Start your essay early"]
        }
