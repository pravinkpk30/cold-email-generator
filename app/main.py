import os
from dotenv import load_dotenv

# Load .env and set defaults BEFORE importing libraries that may initialize tokenizers
load_dotenv()
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("USER_AGENT", "cold-email-generator/1.0 (+contact: example@example.com)")

from logging_config import configure_logging
import streamlit as st
from langchain_community.document_loaders import WebBaseLoader

from chains import Chain
from portfolio import Portfolio
from utils import clean_text

logger = configure_logging("main")


def create_streamlit_app(llm, portfolio, clean_text):
    st.title("📧 Cold Mail Generator")
    url_input = st.text_input("Enter a URL:", value="https://careers.nike.com/senior-software-engineer-sap-order-to-cash-converse-tech-atl-bos-beaverton-location-open/job/R-69822")
    submit_button = st.button("Submit")

    if submit_button:
        try:
            # Provide a proper User-Agent to avoid 403s and warnings
            ua = os.getenv("USER_AGENT")
            headers = {"User-Agent": ua}
            logger.info("Starting scrape", extra={"url": url_input, "user_agent": ua})
            loader = WebBaseLoader([url_input], header_template=headers)

            docs = loader.load()
            logger.debug("Loaded documents", extra={"count": len(docs)})
            if not docs:
                logger.warning("No documents returned from loader", extra={"url": url_input})
                st.warning("No content could be loaded from the URL.")
                return

            raw_text = docs.pop().page_content
            logger.debug("Raw text length", extra={"length": len(raw_text)})

            data = clean_text(raw_text)
            logger.debug("Cleaned text length", extra={"length": len(data)})

            logger.info("Loading portfolio into vector store if needed")
            portfolio.load_portfolio()

            logger.info("Extracting jobs from cleaned text")
            jobs = llm.extract_jobs(data)
            logger.info("Jobs extracted", extra={"jobs_count": len(jobs)})
            # st.write(jobs)
            # st.write(type(jobs))
            # st.write(len(jobs))
            for job in jobs:
                skills = job.get('skills', [])
                logger.debug("Querying portfolio links", extra={"skills": skills})
                links = portfolio.query_links(skills)
                logger.debug("Links retrieved", extra={"links": links})
                logger.info("Generating email for job role", extra={"role": job.get('role')})
                email = llm.write_mail(job, links)
                st.code(email, language='markdown')
        except Exception as e:
            logger.exception("Unhandled error in app flow")
            st.error(f"An Error Occurred: {e}")


if __name__ == "__main__":
    logger.info("Initializing components")
    chain = Chain()
    portfolio = Portfolio()
    st.set_page_config(layout="wide", page_title="Cold Email Generator", page_icon="📧")
    logger.info("Launching Streamlit app UI")
    create_streamlit_app(chain, portfolio, clean_text)