from dotenv import load_dotenv
import os

load_dotenv()

class Settings:
    MCP_BASE_URL = os.getenv("MCP_BASE_URL")
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
    AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")

settings = Settings()