import os
import requests
import json
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

def extract_text(url: str):
    """Fetches a URL and cleans HTML with BeautifulSoup to return pure text."""
    print(f"Scraping: {url}...")
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return None

    # Clean HTML with BeautifulSoup
    soup = BeautifulSoup(response.content, 'html.parser')
    for element in soup(['script', 'style', 'header', 'footer', 'nav']):
        element.decompose()
        
    raw_text = soup.get_text(separator=' ', strip=True)
    truncated_text = raw_text[:15000] # Limiting size for later AI processing
    
    return {
        "url": url,
        "text": truncated_text
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
