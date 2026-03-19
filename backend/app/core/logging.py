import logging
import os
import hashlib

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
    query_hash = hashlib.sha256(query.encode("utf-8")).hexdigest()[:16]
    suspicious_logger.warning(
        f"USER: {user_id} | REASON: {reason} | QUERY_SHA256: {query_hash} | QUERY_LENGTH: {len(query)}"
    )


def log_security_event(reason: str, user_id: str = "anonymous", details: str | None = None):
    """
    Log a generic security event for audit trails.
    """
    message = f"USER: {user_id} | REASON: {reason}"
    if details:
        message = f"{message} | DETAILS: {details[:1000]}"

    suspicious_logger.warning(message)
