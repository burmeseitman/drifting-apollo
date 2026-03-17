import logging
import os
from datetime import datetime

# Ensure logs directory exists
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Configure suspicious activity logger
suspicious_logger = logging.getLogger("suspicious")
suspicious_logger.setLevel(logging.WARNING)

handler = logging.FileHandler(os.path.join(LOG_DIR, "suspicious_activity.log"))
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
suspicious_logger.addHandler(handler)

def log_suspicious_query(query: str, reason: str, user_id: str = "anonymous"):
    """
    Log a suspicious query for audit trails.
    """
    suspicious_logger.warning(f"USER: {user_id} | REASON: {reason} | QUERY: {query[:500]}...")
