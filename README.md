<img width="730" height="178" alt="image" src="https://github.com/user-attachments/assets/5a8ea363-5bf3-4ed3-bd74-631c5c46edb6" />

# 📚 ScholarMatch

**ScholarMatch** is an AI-powered scholarship discovery platform that matches students to scholarships they're most likely to win — using resume parsing, smart profiling, and Gemini-powered personalization.

> *"Don't find scholarships. Let scholarships find you."*

## Authors

- [@cogniera](https://github.com/cogniera)
- [@vkreji](https://www.github.com/vkreji)
- [@Aad1t](https://github.com/Aad1t)
- [@JosiahLam](https://github.com/JosiahLam)

---

## 🧠 About

ScholarMatch simplifies the scholarship application process by aggregating opportunities tailored to each student. Instead of spending hours searching through dozens of websites, students upload their resume or fill out a quick profile — and our AI engine handles the rest. ScholarMatch scrapes real scholarship data, scores each opportunity against the student's profile, and surfaces the ones they're statistically most likely to win.

Whether you're a first-year undergraduate or a graduate student looking for financial aid, ScholarMatch gives you a personalized roadmap to funding your education.

---

## ⭐ Features

- 🔍 **AI-Powered Matching** – Our engine scores every scholarship against your GPA, program, location, academic level, and financial need to surface your best opportunities.
- 📄 **Resume Parsing** – Upload your resume and let Gemini AI extract your profile automatically.
- 🤖 **AI Scholarship Advisor** – Ask our Gemini-powered chatbot anything — essay help, eligibility checks, next steps, and more.
- 📊 **Dashboard & Roadmap** – Visualize your application progress and see exactly what you need to improve to unlock more scholarships.
- 📌 **Application Tracker** – Track deadlines and submission statuses across all your scholarships in one place.
- 🔐 **Secure Auth** – Auth0-powered login keeps your profile safe and persistent across sessions.
- ☁️ **Cloud File Storage** – Resumes and transcripts are securely stored via Cloudinary.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Tailwind CSS, React Router, React Three Fiber |
| Backend | Python, FastAPI, Uvicorn |
| Database | Supabase (PostgreSQL) |
| Authentication | Auth0 |
| AI | Google Gemini API |
| File Storage | Cloudinary |
| Scraping | BeautifulSoup, Requests |
| Deployment | Vultr, Docker |

---

## 🚀 Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- An [Auth0](https://auth0.com) application
- A [Cloudinary](https://cloudinary.com) account
- A [Google Gemini](https://ai.google.dev) API key

---

### 1. Clone the repository

```bash
git clone https://github.com/cogniera/scholarmatch.git
cd scholarmatch
```

---

### 2. Backend setup

```bash
cd src/backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `src/backend/.env`:

```dotenv
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
AUTH0_DOMAIN=your-auth0-domain
AUTH0_AUDIENCE=https://scholarmatch-api
GEMINI_API_KEY=your-gemini-api-key
```

Start the backend:

```bash
uvicorn app.main:app --reload
# Runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

---

### 3. Frontend setup

```bash
cd src/frontend
npm install
```

Create `src/frontend/.env`:

```dotenv
VITE_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=your-upload-preset
VITE_API_URL=http://localhost:8000
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_AUDIENCE=https://scholarmatch-api
```

Start the frontend:

```bash
npm run dev
# Runs at http://localhost:5173
```

---

### 4. Supabase schema

Run the following in your **Supabase SQL Editor** to create the required tables:

```sql
CREATE TABLE public.users (
  id uuid NOT NULL,
  name text,
  email text,
  gpa double precision,
  program text,
  location text,
  academic_level text,
  financial_need boolean,
  extracurriculars text,
  resume_url text,
  transcript_url text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.scholarships (
  id integer NOT NULL DEFAULT nextval('scholarships_id_seq'::regclass),
  title text,
  provider text,
  amount integer,
  deadline date,
  eligibility text,
  location text,
  program text,
  gpa_requirement double precision,
  financial_need_required boolean DEFAULT false,
  academic_level text,
  link text,
  CONSTRAINT scholarships_pkey PRIMARY KEY (id),
  CONSTRAINT scholarships_title_provider_unique UNIQUE (title, provider)
);

CREATE TABLE public.matches (
  user_id uuid,
  scholarship_id integer,
  match_score double precision,
  ai_explanation text
);
```

---

### 5. Scraper (optional)

To populate the scholarships table with real scraped data:

```bash
cd src/scraper
pip install -r requirements.txt
```

Create `src/scraper/.env`:

```dotenv
GEMINI_API_KEY=your-gemini-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
```

Run the scraper:

```bash
python scraper.py          # Scrapes scholarship pages
python save_to_supabase.py # Saves results to Supabase
```

---

### 6. Auth0 configuration

In your Auth0 dashboard:

- **Allowed Callback URLs:** `http://localhost:5173`
- **Allowed Logout URLs:** `http://localhost:5173`
- **Allowed Web Origins:** `http://localhost:5173`
- Create an API with identifier `https://scholarmatch-api`
- Authorize your application to use that API

---

## 📁 Project Structure

```
scholarmatch/
├── src/
│   ├── backend/          # FastAPI backend
│   │   └── app/
│   │       ├── api/routes/   # profile, scholarships, uploads
│   │       ├── core/         # Auth0 JWT verification
│   │       ├── database/     # Supabase client
│   │       ├── models/       # Pydantic schemas
│   │       └── services/     # Gemini AI, matching engine
│   ├── frontend/         # React frontend
│   │   └── src/
│   │       ├── components/   # UI components
│   │       ├── context/      # App state (reducer)
│   │       ├── pages/        # Route pages
│   │       └── services/     # API calls
│   └── scraper/          # Scholarship web scraper
└── docker-compose.yml
```

---

## 📄 License

MIT

## 🖼️ Demo / Screenshot

> wip


