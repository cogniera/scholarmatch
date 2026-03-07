# ScholarMatch Backend

FastAPI backend for the ScholarMatch AI-powered scholarship discovery platform.

## Tech Stack

| Tool | Purpose |
|---|---|
| FastAPI | REST API framework |
| Supabase | Database (PostgreSQL) |
| Auth0 | JWT authentication |
| Google Gemini | AI explanations + chatbot |
| Cloudinary | File upload URLs |

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables

```bash
cp .env.example .env
# Fill in all values in .env
```

### 3. Set Up Supabase Database

- Go to your Supabase project → SQL Editor
- Run the contents of `schema.sql`
- This creates the `users`, `scholarships`, and `matches` tables + seeds sample data

### 4. Configure Auth0

- Create an API in Auth0 dashboard
- Set `AUTH0_DOMAIN` to your tenant (e.g. `dev-abc123.us.auth0.com`)
- Set `AUTH0_AUDIENCE` to your API identifier (e.g. `https://scholarmatch-api`)

### 5. Run the Server

```bash
uvicorn main:app --reload
```

API docs available at: http://localhost:8000/docs

---

## API Endpoints

### Profile
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/profile` | ✅ | Create student profile |
| GET | `/profile` | ✅ | Get current user's profile |
| PATCH | `/profile` | ✅ | Update profile |
| DELETE | `/profile` | ✅ | Delete profile |

### Scholarships
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/scholarships` | ❌ | List all scholarships |
| GET | `/scholarships/match` | ✅ | Get matched scholarships |
| GET | `/scholarships/{id}` | ❌ | Get single scholarship |
| GET | `/scholarships/{id}/readiness` | ✅ | AI readiness score |
| GET | `/scholarships/{id}/checklist` | ❌ | Application checklist |

### AI & Uploads
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/upload` | ✅ | Save Cloudinary URLs |
| POST | `/chat` | ✅ | AI application assistant |

---

## Key Design Decisions

**Auth0 JWT Flow:**
- Frontend logs in via Auth0 SDK → receives JWT
- Every request sends `Authorization: Bearer <token>` header
- Backend verifies JWT signature using Auth0's public keys (JWKS)
- User ID extracted from `sub` claim — no passwords stored

**Cloudinary Upload Flow:**
- Frontend uploads file DIRECTLY to Cloudinary (not through our server)
- Cloudinary returns `secure_url`
- Frontend sends that URL to `POST /upload`
- We store the URL in Supabase — we never touch the file

**Matching Engine:**
- Rule-based scoring (fast, deterministic)
- Gemini called only when `?explain=true` to control costs
- Results cached in `matches` table

---

## Deployment on Vultr

```bash
# Build Docker image
docker build -t scholarmatch-backend .

# Run container
docker run -d \
  --env-file .env \
  -p 8000:8000 \
  scholarmatch-backend
```
