import os
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.exceptions import OutputParserException
from dotenv import load_dotenv
from .logging_config import configure_logging

load_dotenv()
logger = configure_logging("chains")

class Chain:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        model = "llama-3.3-70b-versatile"
        logger.info("Initializing ChatGroq LLM", extra={"model": model, "has_api_key": bool(api_key)})
        self.llm = ChatGroq(temperature=0, groq_api_key=api_key, model_name=model)

    def extract_jobs(self, cleaned_text):
        logger.info("Invoking extract_jobs", extra={"text_length": len(cleaned_text) if cleaned_text else 0})
        prompt_extract = PromptTemplate.from_template(
            """
            ### SCRAPED TEXT FROM WEBSITE:
            {page_data}
            ### INSTRUCTION:
            The scraped text is from the career's page of a website.
            Your job is to extract the job postings and return them in JSON format containing the following keys: `role`, `experience`, `skills` and `description`.
            Only return the valid JSON.
            ### VALID JSON (NO PREAMBLE):
            """
        )
        chain_extract = prompt_extract | self.llm
        res = chain_extract.invoke(input={"page_data": cleaned_text})
        logger.debug("LLM raw response for extract_jobs", extra={"content_preview": str(res.content)[:300] if hasattr(res, 'content') else None})
        try:
            json_parser = JsonOutputParser()
            res = json_parser.parse(res.content)
        except OutputParserException:
            logger.exception("Failed to parse jobs from LLM output")
            raise OutputParserException("Context too big. Unable to parse jobs.")
        parsed = res if isinstance(res, list) else [res]
        logger.info("extract_jobs parsed results", extra={"jobs_count": len(parsed)})
        return parsed

    def write_mail(self, job, links):
        logger.info("Invoking write_mail", extra={"role": job.get('role'), "skills": job.get('skills'), "links_count": sum(len(m) for m in links) if links else 0})
        prompt_email = PromptTemplate.from_template(
            """
            ### JOB DESCRIPTION:
            {job_description}

            ### INSTRUCTION:
            You are Praveen, a business development executive at XYZ. XYZ is an AI & Software Consulting company dedicated to facilitating
            the seamless integration of business processes through automated tools. 
            Over our experience, we have empowered numerous enterprises with tailored solutions, fostering scalability, 
            process optimization, cost reduction, and heightened overall efficiency. 
            Your job is to write a cold email to the client regarding the job mentioned above describing the capability of XYZ 
            in fulfilling their needs.
            Also add the most relevant ones from the following links to showcase XYZ's portfolio: {link_list}
            Remember you are Praveen, BDE at XYZ. 
            Do not provide a preamble.
            ### EMAIL (NO PREAMBLE):

            """
        )
        chain_email = prompt_email | self.llm
        res = chain_email.invoke({"job_description": str(job), "link_list": links})
        logger.debug("LLM email content preview", extra={"content_preview": str(res.content)[:300] if hasattr(res, 'content') else None})
        return res.content

if __name__ == "__main__":
    print(os.getenv("GROQ_API_KEY"))