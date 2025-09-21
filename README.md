# 📧 Cold Mail Generator
Cold email generator for services company using groq, langchain and streamlit. It allows users to input the URL of a company's careers page. The tool then extracts job listings from that page and generates personalized cold emails. These emails include relevant portfolio links sourced from a vector database, based on the specific job descriptions. 

**Imagine a scenario:**

- Nike needs a Principal Software Engineer and is spending time and resources in the hiring process, on boarding, training etc
- Atliq is Software Development company can provide a dedicated software development engineer to Nike. So, the business development executive (Mohan) from Atliq is going to reach out to Nike via a cold email.

![img.png](assets/img.png)

## Architecture Diagram
![img.png](assets/architecture.png)

## Set-up
1. To get started we first need to get an API_KEY from here: https://console.groq.com/keys. Inside `app/.env` update the value of `GROQ_API_KEY` with the API_KEY you created. 


2. To get started, first install the dependencies using:
    ```commandline
     pip install -r requirements.txt
    ```
   
## Tech Stack
- Backend
  - FastAPI (Python) – REST API server (`app/server.py`)
  - LangChain + Groq (`langchain-groq`) – LLM pipeline
  - ChromaDB – simple vector store for portfolio matching
  - python-dotenv – environment config
  - Uvicorn – ASGI server
- Frontend
  - React 18 (TypeScript) – UI in `ui/`
  - Vite – dev server & bundler with proxy to backend
  - Tailwind CSS + PostCSS – styling

## Environment Variables
Create an `.env` file in the project root or under `app/` with:
```env
GROQ_API_KEY=your_groq_key
USER_AGENT="cold-email-generator/1.0 (+https://your-site-or-email)"
TOKENIZERS_PARALLELISM=false
LOG_LEVEL=INFO
```

## Run the Backend (FastAPI)
From the project root:
```bash
uvicorn app.server:app --reload
```
This starts the API on http://localhost:8000

Useful endpoints:
- `GET /health` – health check
- `POST /api/generate` – body: `{ "url": "<job_url>" }`, returns `{ emails: string[] }`

## Run the Frontend (React + Vite)
From the `ui/` directory:
```bash
npm install
npm run dev
```
Open http://localhost:5173 – Vite proxies API calls to `http://localhost:8000`.

## Production Build
From `ui/`:
```bash
npm run build
```
This generates `ui/dist/`. The FastAPI server is configured to automatically serve this production build at the root path when present.

Then start the backend from the project root:
```bash
uvicorn app.server:app --reload
```
Open http://localhost:8000 to use the app (served from `ui/dist`).

## Legacy: Streamlit (optional)
You can still run the older Streamlit demo (not recommended if using the new React UI):
```bash
streamlit run app/main.py
```
   

Copyright (C) Codebasics Inc. All rights reserved.

**Additional Terms:**
This software is licensed under the MIT License. However, commercial use of this software is strictly prohibited without prior written permission from the author. Attribution must be given in all copies or substantial portions of the software.