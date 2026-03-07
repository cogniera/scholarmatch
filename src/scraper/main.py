import os
import json
import time
from typing import List
import google.generativeai as genai
from dotenv import load_dotenv

def process_webpages(pages: List[dict]):
    # Load environment variables
    load_dotenv()
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
    
    all_scholarships = []
    
    model = genai.GenerativeModel('gemini-2.5-flash') 
    
    print(f"Received {len(pages)} pages for processing.")
    
    for page in pages:
        time.sleep(4)  # Wait 4 seconds to avoid hitting Gemini Free Tier limits
        url = page.get("url", "")
        text = page.get("text", "")
        print(f"Extracting scholarships from: {url}")
        prompt = f"""
        You are an expert data extraction algorithm. Find all the scholarships/bursaries mentioned in the text and extract their details into a strict JSON array format.
        
        For each scholarship, extract:
        - name: String (The title of the scholarship)
        - organization: String (The entity offering it)
        - amount: String (The dollar amount mentioned. If it varies or is not stated, put "Varies" or "Not specified")
        - description: String (A 2-3 sentence summary)
        - eligibility_keywords: Array of Strings (Things like "leadership", "indigenous", "entrance")
        - deadline: String (The application due date. Format as YYYY-MM-DD if possible, otherwise "Not specified")
        - application_url: String (The exact link or email to apply. If not found in text, fallback to the URL Source provided below)
        - education_level: Array of Strings (e.g., ["High School", "Undergraduate", "Masters", "PhD"])
        - is_renewable: Boolean (true if it mentions it can be renewed for subsequent years, false otherwise)
        
        URL Source: {url}
        
        Here is the webpage text:
        ---
        {text}
        ---
        
        RESPOND ONLY WITH THE RAW JSON ARRAY. DO NOT ADD MARKDOWN CODE BLOCKS OR EXPLANATIONS.
        """
        
        try:
            response = model.generate_content(prompt)
            # Clean Gemini's output just in case it added markdown
            cleaned_json_string = response.text.replace('```json', '').replace('```', '').strip()
            if not cleaned_json_string:
                continue
            data = json.loads(cleaned_json_string)
            if isinstance(data, list):
                all_scholarships.extend(data)
                
        except Exception as e:
            print(f"Gemini AI Extraction Failed for {url}: {e}")
            
    # Output the final compiled list to a JSON file
    output_file = 'scraped_scholarships.json'
    try:
        if os.path.exists(output_file):
            with open(output_file, 'r') as f:
                existing_data = json.load(f)
                all_scholarships = existing_data + all_scholarships
    except Exception:
        pass
        
    with open(output_file, 'w') as f:
        json.dump(all_scholarships, f, indent=4)
        
    print(f"Saved {len(all_scholarships)} to {output_file}")
    return {
        "status": "success", 
        "message": f"Processed {len(pages)} pages", 
        "total_scholarships_saved": len(all_scholarships)
    }

if __name__ == "__main__":
    print("This file contains the Gemini processing logic. Run scraper.py to start.")
