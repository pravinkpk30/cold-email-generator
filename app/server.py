import os
from typing import List
from dotenv import load_dotenv

# Load .env and set defaults BEFORE importing libraries that may initialize tokenizers
load_dotenv()
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("USER_AGENT", "cold-email-generator/1.0 (+contact: example@example.com)")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from langchain_community.document_loaders import WebBaseLoader

from .logging_config import configure_logging
from .chains import Chain
from .portfolio import Portfolio
from .utils import clean_text

logger = configure_logging("api")
app = FastAPI(title="Cold Email Generator API", version="1.0.0")

# Allow local frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

"""Static frontend setup: serve under /static and handle root at /."""
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")


class GenerateRequest(BaseModel):
    url: str


class GenerateResponse(BaseModel):
    emails: List[str]


# Initialize components once
logger.info("Initializing backend components")
chain = Chain()
portfolio = Portfolio()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    index_path = os.path.join(static_dir, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    # Fallback minimal page
    return HTMLResponse("""
    <!DOCTYPE html>
    <html><head><meta charset='utf-8'><title>Cold Email Generator</title></head>
    <body>
      <h1>Cold Email Generator</h1>
      <p>Static files not found. Ensure app/static/index.html exists.</p>
    </body></html>
    """)


@app.post("/api/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest):
    if not req.url:
        raise HTTPException(status_code=400, detail="url is required")

    try:
        ua = os.getenv("USER_AGENT")
        headers = {"User-Agent": ua}
        logger.info("Starting scrape", extra={"url": req.url, "user_agent": ua})
        loader = WebBaseLoader([req.url], header_template=headers)

        docs = loader.load()
        logger.debug("Loaded documents", extra={"count": len(docs)})
        if not docs:
            logger.warning("No documents returned from loader", extra={"url": req.url})
            raise HTTPException(status_code=422, detail="No content could be loaded from the URL.")

        raw_text = docs.pop().page_content
        logger.debug("Raw text length", extra={"length": len(raw_text)})

        data = clean_text(raw_text)
        logger.debug("Cleaned text length", extra={"length": len(data)})

        logger.info("Loading portfolio into vector store if needed")
        portfolio.load_portfolio()

        logger.info("Extracting jobs from cleaned text")
        jobs = chain.extract_jobs(data)
        logger.info("Jobs extracted", extra={"jobs_count": len(jobs)})

        emails: List[str] = []
        for job in jobs:
            skills = job.get("skills", [])
            logger.debug("Querying portfolio links", extra={"skills": skills})
            links = portfolio.query_links(skills)
            logger.debug("Links retrieved", extra={"links": links})
            logger.info("Generating email for job", extra={"role": job.get('role')})
            email = chain.write_mail(job, links)
            emails.append(email)

        return GenerateResponse(emails=emails)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error in generate endpoint")
        raise HTTPException(status_code=500, detail=str(e))


# Entrypoint: `uvicorn app.server:app --reload`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.server:app", host="0.0.0.0", port=8000, reload=True)
