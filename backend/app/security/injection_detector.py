import re

class InjectionDetector:
    # Common prompt injection patterns
    PATTERNS = [
        r"(?i)ignore (all )?previous instructions",
        r"(?i)system prompt",
        r"(?i)you are now",
        r"(?i)as an untethered",
        r"(?i)bypass",
        r"(?i)output the system",
        r"(?i)forget (everything|all)",
    ]

    @staticmethod
    def is_malicious(prompt: str) -> bool:
        """
        Check if a prompt contains common injection patterns.
        """
        for pattern in InjectionDetector.PATTERNS:
            if re.search(pattern, prompt):
                return True
        return False

    @staticmethod
    def sanitize(text: str) -> str:
        """
        Basic sanitization to remove potentially harmful characters
        while preserving natural language.
        """
        # Remove any scripts or HTML tags just in case
        sanitized = re.sub(r"<[^>]*?>", "", text)
        return sanitized
