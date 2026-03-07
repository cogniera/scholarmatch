import os
import json
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))

app = FastAPI(title="ScholarMatch Webhook API")

class ScrapedPage(BaseModel):
    url: str
    text: str

import time

@app.post("/process-webpages")
async def process_webpages(pages: List[ScrapedPage]):
    all_scholarships = []
    model = genai.GenerativeModel('gemini-2.5-flash') 
    
    print(f"Received {len(pages)} pages for processing.")
    
    for page in pages:
        time.sleep(4)  # Wait 4 seconds to avoid hitting Gemini Free Tier 15 RPM limit
        print(f"Extracting scholarships from: {page.url}")
        prompt = f"""
        You are an expert data extraction algorithm. Find all the scholarships/bursaries mentioned in the text and extract their details into a strict JSON array format.
        
        For each scholarship, extract:
        - name: String (The title of the scholarship)
        - organization: String (The entity offering it)
        - amount: String (The dollar amount mentioned. If it varies or is not stated, put "Varies" or "Not specified")
        - description: String (A 2-3 sentence summary)
        - eligibility_keywords: Array of Strings (Things like "leadership", "indigenous", "entrance")
        
        URL Source: {page.url}
        
        Here is the webpage text:
        ---
        {page.text}
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
            print(f"Gemini AI Extraction Failed for {page.url}: {e}")
            
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
    import uvicorn
    print("Starting API Server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
