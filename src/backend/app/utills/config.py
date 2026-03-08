from dotenv import load_dotenv
import os

load_dotenv()


def _parse_csv_env(value: str | None, default: list[str]) -> list[str]:
    if not value:
        return default
    parsed = [item.strip() for item in value.split(",") if item.strip()]
    return parsed or default

class Settings:
    MCP_BASE_URL = os.getenv("MCP_BASE_URL")
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
    AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
    CORS_ALLOWED_ORIGINS = _parse_csv_env(
        os.getenv("CORS_ALLOWED_ORIGINS"),
        [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8000",
            "http://localhost:80",
            "http://localhost",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000",
            "http://127.0.0.1:80",
            "http://127.0.0.1",
        ],
    )

settings = Settings()