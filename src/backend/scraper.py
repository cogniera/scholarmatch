import os
import requests
import json
from bs4 import BeautifulSoup
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables (Make sure your friend's repo has a .env with GEMINI_API_KEY)
load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

# Hardcoded scholarship URLs to scrape
SCHOLARSHIP_URLS = [
    "https://www.horatioalger.ca/en/scholarships/",
    "https://mcgill.ca/studentaid/scholarships-aid/future-undergrads/entrance-scholarships",
    "https://www.rbc.com/dms/enterprise/scholarships.html"
]

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def extract_scholarships(url: str):
    """Fetches a URL, cleans HTML with BeautifulSoup, and structures data with Gemini."""
    print(f"Scraping: {url}...")
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return []

    # 1. Clean HTML with BeautifulSoup
    soup = BeautifulSoup(response.content, 'html.parser')
    for element in soup(['script', 'style', 'header', 'footer', 'nav']):
        element.decompose()
        
    raw_text = soup.get_text(separator=' ', strip=True)
    truncated_text = raw_text[:15000] # Limiting size for Gemini

    # 2. Structure data with Gemini
    prompt = f"""
    You are an expert data extraction algorithm. Find all the scholarships/bursaries mentioned in the text and extract their details into a strict JSON array format.
    
    For each scholarship, extract:
    - name: String (The title of the scholarship)
    - organization: String (The entity offering it)
    - amount: Float (The largest dollar amount mentioned. If none, put 0)
    - description: String (A 2-3 sentence summary)
    - eligibility_keywords: Array of Strings (Things like "leadership", "indigenous", "entrance")
    
    URL Source: {url}
    
    Here is the webpage text:
    ---
    {truncated_text}
    ---
    
    RESPOND ONLY WITH THE RAW JSON ARRAY. DO NOT ADD MARKDOWN CODE BLOCKS OR EXPLANATIONS.
    """
    
    model = genai.GenerativeModel('gemini-2.5-flash') 
    
    try:
        response = model.generate_content(prompt)
        # Clean Gemini's output just in case it added markdown
        cleaned_json_string = response.text.replace('```json', '').replace('```', '').strip()
        data = json.loads(cleaned_json_string)
        return data
        
    except Exception as e:
        print(f"Gemini AI Extraction Failed for {url}: {e}")
        return []

def run_scraper():
    all_scholarships = []
    
    for url in SCHOLARSHIP_URLS:
        scraped_data = extract_scholarships(url)
        all_scholarships.extend(scraped_data)
        
    # Output the final compiled list to a JSON file
    with open('scraped_scholarships.json', 'w') as f:
        json.dump(all_scholarships, f, indent=4)
        
    print(f"\nSuccessfully saved {len(all_scholarships)} scholarships to scraped_scholarships.json")

if __name__ == "__main__":
    run_scraper()
