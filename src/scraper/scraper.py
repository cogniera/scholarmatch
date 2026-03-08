import os
import requests
import json
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from main import process_webpages

# Hardcoded scholarship URLs to scrape
SCHOLARSHIP_URLS = [
    # External Foundations
    "https://www.horatioalger.ca/en/scholarships/",
    "https://www.rbc.com/dms/enterprise/scholarships.html",
    "https://indspire.ca/programs/students/bursaries-scholarships/",
    "https://loranscholar.ca/the-program/",
    
    # Accessible Universities
    "https://mcgill.ca/studentaid/scholarships-aid/future-undergrads/entrance-scholarships",
    "https://www.concordia.ca/students/financial/scholarships-funding/bursaries.html",
    "https://www.ucalgary.ca/registrar/finances/awards-scholarships-and-bursaries/entrance",
    "https://www.dal.ca/admissions/money_matters/awards-financial-aid/scholarships.html",
    "https://carleton.ca/awards/scholarships/",
    "https://www.uottawa.ca/study/undergraduate-studies/financing-studies/scholarships"
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}


def _resolve_url(src: str, base_url: str) -> str:
    """Resolve a potentially relative URL to an absolute URL."""
    if not src:
        return ""
    src = src.strip()
    if src.startswith("data:"):
        return ""
    return urljoin(base_url, src)


def _is_valid_image_url(url: str) -> bool:
    """Basic check that the URL looks like it could be a real image."""
    if not url or url.startswith("data:"):
        return False
    parsed = urlparse(url)
    return bool(parsed.scheme in ("http", "https") and parsed.netloc)


def extract_images(soup: BeautifulSoup, url: str) -> dict:
    """
    Extract logo and banner/page image URLs from HTML.
    
    Strategy (priority order):
    - Logo: og:image → apple-touch-icon → favicon → first img with 'logo' in src/alt/class
    - Banner: og:image → twitter:image → largest/most prominent <img> on page
    """
    logo_url = ""
    banner_url = ""
    all_page_images = []

    # --- 1. Open Graph image (great for banner) ---
    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        resolved = _resolve_url(og_image["content"], url)
        if _is_valid_image_url(resolved):
            banner_url = resolved

    # --- 2. Twitter card image (fallback banner) ---
    if not banner_url:
        twitter_img = soup.find("meta", attrs={"name": "twitter:image"})
        if twitter_img and twitter_img.get("content"):
            resolved = _resolve_url(twitter_img["content"], url)
            if _is_valid_image_url(resolved):
                banner_url = resolved

    # --- 3. Apple Touch Icon (good logo source) ---
    apple_icon = soup.find("link", rel=lambda r: r and "apple-touch-icon" in r)
    if apple_icon and apple_icon.get("href"):
        resolved = _resolve_url(apple_icon["href"], url)
        if _is_valid_image_url(resolved):
            logo_url = resolved

    # --- 4. Favicon (fallback logo) ---
    if not logo_url:
        favicon = soup.find("link", rel=lambda r: r and "icon" in r)
        if favicon and favicon.get("href"):
            resolved = _resolve_url(favicon["href"], url)
            if _is_valid_image_url(resolved):
                logo_url = resolved

    # --- 5. Scan all <img> tags for logos and page images ---
    for img in soup.find_all("img", src=True):
        src = _resolve_url(img.get("src", ""), url)
        if not _is_valid_image_url(src):
            continue

        alt = (img.get("alt") or "").lower()
        classes = " ".join(img.get("class") or []).lower()
        src_lower = src.lower()

        # Check if this looks like a logo
        is_logo_candidate = any(
            keyword in text
            for keyword in ("logo", "brand", "emblem", "crest")
            for text in (alt, classes, src_lower)
        )

        if is_logo_candidate and not logo_url:
            logo_url = src
        else:
            all_page_images.append(src)

    # --- 6. Fallback: use favicon URL construction if nothing found ---
    if not logo_url:
        parsed = urlparse(url)
        logo_url = f"{parsed.scheme}://{parsed.netloc}/favicon.ico"

    # If no banner found, pick the first substantial page image
    if not banner_url and all_page_images:
        banner_url = all_page_images[0]

    return {
        "logo_url": logo_url,
        "banner_url": banner_url,
        "page_images": all_page_images[:10],  # Cap at 10 for Gemini context
    }


def extract_text(url: str):
    """Fetches a URL, extracts images/logos, then cleans HTML to return pure text."""
    print(f"Scraping: {url}...")
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return None

    # Parse HTML
    soup = BeautifulSoup(response.content, 'html.parser')

    # Extract images BEFORE decomposing elements
    image_data = extract_images(soup, url)
    print(f"  Found logo: {image_data['logo_url'][:80]}...")
    print(f"  Found banner: {image_data['banner_url'][:80] if image_data['banner_url'] else 'None'}...")
    print(f"  Found {len(image_data['page_images'])} page images")

    # Now strip non-content elements for text extraction
    for element in soup(['script', 'style', 'header', 'footer', 'nav']):
        element.decompose()
        
    raw_text = soup.get_text(separator=' ', strip=True)
    truncated_text = raw_text[:15000]  # Limiting size for later AI processing
    
    return {
        "url": url,
        "text": truncated_text,
        "logo_url": image_data["logo_url"],
        "banner_url": image_data["banner_url"],
        "page_images": image_data["page_images"],
    }


def run_scraper():
    all_pages = []
    
    for url in SCHOLARSHIP_URLS:
        page_data = extract_text(url)
        if page_data:
            all_pages.append(page_data)
            
    if not all_pages:
        print("No data extracted.")
        return

    # Output JSON of all the raw text locally so we can view it
    with open('raw_scraped_text.json', 'w') as f:
        json.dump(all_pages, f, indent=4)
        
    print(f"\nSuccessfully saved raw text to raw_scraped_text.json.")
    print(f"Processing pages with Gemini...")
    
    try:
        response = process_webpages(all_pages)
        print("Process Response:", response)
    except Exception as e:
        print(f"Failed to process with Gemini: {e}")

if __name__ == "__main__":
    run_scraper()
