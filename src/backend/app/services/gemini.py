import os
from google import genai
from typing import Optional

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.0-flash"


def explain_match(user: dict, scholarship: dict, match_reasons: list) -> str:
    prompt = f"""
You are a helpful scholarship advisor. Explain in 3-4 bullet points why this student matches.

Student: {user.get('name')}, {user.get('program')}, GPA {user.get('gpa')}, {user.get('location')}
Scholarship: {scholarship.get('title')} — {scholarship.get('eligibility')}
Match reasons: {", ".join(match_reasons)}

Be encouraging and specific. Under 100 words.
"""
    response = client.models.generate_content(model=MODEL, contents=prompt)
    return response.text.strip()


def application_chat(question: str, user: dict, scholarship=None, resume_text=None) -> str:
    context = f"""
Student: {user.get('name')}, {user.get('program')}, GPA {user.get('gpa')},
{user.get('location')}, {user.get('academic_level')}
Extracurriculars: {user.get('extracurriculars') or 'Not provided'}
Financial Need: {"Yes" if user.get('financial_need') else "No"}
"""
    if scholarship:
        context += f"""
Scholarship: {scholarship.get('title')} by {scholarship.get('provider')}
Amount: ${scholarship.get('amount')}, Deadline: {scholarship.get('deadline')}
Eligibility: {scholarship.get('eligibility')}
"""
    if resume_text:
        context += f"\nResume:\n{resume_text[:2000]}"

    prompt = f"""You are ScholarMatch AI, a friendly scholarship advisor.
{context}
Student question: {question}
Give personalized, actionable advice."""

    response = client.models.generate_content(model=MODEL, contents=prompt)
    return response.text.strip()


def readiness_score(user: dict, scholarship: dict) -> dict:
    prompt = f"""
Rate how ready this student is for this scholarship. 
Student GPA: {user.get('gpa')}, Program: {user.get('program')}, 
Extracurriculars: {user.get('extracurriculars') or 'None'}
Scholarship: {scholarship.get('title')}, Requirements: {scholarship.get('eligibility')}

Respond ONLY in this JSON format (no markdown):
{{"score": <0-100>, "summary": "<one sentence>", "tips": ["<tip1>", "<tip2>", "<tip3>"]}}
"""
    response = client.models.generate_content(model=MODEL, contents=prompt)
    text = response.text.strip().replace("```json", "").replace("```", "").strip()
    import json
    try:
        return json.loads(text)
    except Exception:
        return {"score": 70, "summary": "Unable to score.", "tips": ["Start essay early", "Get a reference letter", "Improve extracurriculars"]}