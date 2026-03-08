"""
automation.py — Demo automation endpoints (headed Playwright flows).

For the hackathon demo: when the user clicks "Fill with AI" on the
Applications page, the frontend calls POST /automation/rbc-ignite.
This launches a visible Chromium window on the backend machine that
navigates to the RBC scholarships site, opens the Ignite portal, and
auto-fills the registration form.

Uses sync Playwright in a thread to avoid Windows asyncio subprocess
NotImplementedError (uvicorn's event loop can't create subprocesses on Windows).
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter

from playwright.sync_api import sync_playwright

router = APIRouter(prefix="/automation", tags=["Automation"])

# Single thread so we don't launch multiple browsers at once
_executor = ThreadPoolExecutor(max_workers=1)

RBC_SCHOLARSHIPS_URL = "https://www.rbc.com/dms/enterprise/scholarships.html"
RBC_IGNITE_PORTAL_URL = "https://portal.scholarshippartners.ca/welcome/RBC-Ignite-EN"
RBC_IGNITE_SIGNUP_URL = (
    "https://portal.scholarshippartners.ca/s_signup.jsp?token=XVtQC1oGYV5dRRBdXxNWS1xRbEl9E3M%3D&tid=1"
)


def _run_rbc_ignite_sync() -> None:
    """
    Headed Playwright flow (sync). Runs in a thread to avoid asyncio subprocess
    issues on Windows.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=150)
        page = browser.new_page()

        # 1) RBC scholarships landing page
        page.goto(RBC_SCHOLARSHIPS_URL, wait_until="networkidle")

        # 2) Try to click "Apply today" via XPath
        try:
            page.click('/html/body/div/div/main/div/div[1]/div/div[4]/div[2]/a')
        except Exception:
            page.goto(RBC_IGNITE_PORTAL_URL, wait_until="networkidle")

        page.wait_for_timeout(2000)

        # 3) Ensure on Ignite portal, then go to signup
        if "portal.scholarshippartners.ca" not in page.url:
            page.goto(RBC_IGNITE_PORTAL_URL, wait_until="networkidle")

        page.goto(RBC_IGNITE_SIGNUP_URL, wait_until="networkidle")

        # 4) Fill registration form
        applicant = {
            "first_name": "Paarth",
            "last_name": "Student",
            "email": "paarth.student@example.com",
            "phone": "5551234567",
            "address": "123 Main Street",
            "city": "Toronto",
            "province_value": "Ontario",  # visible text in province dropdown
            "postal": "M1M1M1",
            "country_value": "10",       # numeric value for Canada in ucountry select
            "correspondence_value": "E", # English
        }

        def safe_fill(selector: str, value: str) -> None:
            try:
                page.fill(selector, value)
            except Exception:
                pass

        def safe_select_by_label(selector: str, label: str) -> None:
            try:
                page.select_option(selector, label=label)
            except Exception:
                pass
        def safe_select_by_value(selector: str, value: str) -> None:
            try:
                page.select_option(selector, value=value)
            except Exception:
                pass

        # Use the concrete IDs you provided from the page
        safe_fill('#firstname', applicant["first_name"])
        safe_fill('#lastname', applicant["last_name"])
        safe_fill('#email', applicant["email"])
        safe_fill('#uphone', applicant["phone"])
        safe_fill('#uaddress', applicant["address"])
        safe_fill('#ucity', applicant["city"])
        safe_fill('#upostalcode', applicant["postal"])
        # Country first so province options are correct, then province by label.
        safe_select_by_value('#ucountry', applicant["country_value"])
        page.wait_for_timeout(500)
        safe_select_by_label('#ustate', applicant["province_value"])
        safe_select_by_value('#cf_1392836', applicant["correspondence_value"])

        # 5) Do NOT submit – pause briefly so the form looks filled, then close.
        page.wait_for_timeout(1500)
        browser.close()


@router.post("/rbc-ignite")
async def trigger_rbc_ignite() -> dict:
    """
    Fire-and-forget endpoint used by the frontend "Fill with AI" button.

    Runs Playwright in a thread (sync API) to avoid Windows asyncio
    subprocess NotImplementedError. Returns immediately.
    """
    loop = asyncio.get_event_loop()
    loop.run_in_executor(_executor, _run_rbc_ignite_sync)
    return {"status": "started"}

