# backend/src/utils/logger.py
import logging
import sys

logger = logging.getLogger("deriv")

if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

# Change to DEBUG while troubleshooting; revert to INFO in production
logger.setLevel(logging.DEBUG)
