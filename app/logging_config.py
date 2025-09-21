import logging
import os
from pathlib import Path


def configure_logging(name: str = "app", level: str | int | None = None) -> logging.Logger:
    """Configure application-wide logging.

    - Sets console and file handlers with a consistent format
    - Respects LOG_LEVEL env var (default INFO)
    - Creates logs directory if needed
    - Avoids adding duplicate handlers on re-runs (Streamlit)
    """
    log_level = level or os.getenv("LOG_LEVEL", "INFO").upper()
    numeric_level = getattr(logging, log_level, logging.INFO)

    logger = logging.getLogger(name)
    logger.setLevel(numeric_level)

    # Avoid duplicate handlers if Streamlit reloads the script
    if logger.handlers:
        # Update levels on existing handlers and return
        for h in logger.handlers:
            h.setLevel(numeric_level)
        return logger

    fmt = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    ch = logging.StreamHandler()
    ch.setLevel(numeric_level)
    ch.setFormatter(fmt)
    logger.addHandler(ch)

    # File handler
    logs_dir = Path("logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    fh = logging.FileHandler(logs_dir / "app.log", encoding="utf-8")
    fh.setLevel(numeric_level)
    fh.setFormatter(fmt)
    logger.addHandler(fh)

    # Reduce noise from verbose libraries if needed
    for noisy in [
        "urllib3",
        "chromadb",
        "httpx",
        "requests",
        "langchain",
        "sentence_transformers",
    ]:
        logging.getLogger(noisy).setLevel(os.getenv("NOISY_LIB_LOG_LEVEL", "WARNING"))

    logger.debug("Logger configured: level=%s, file=logs/app.log", log_level)
    return logger
