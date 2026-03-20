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
        r"(?i)new role",
        r"(?i)act as",
        r"(?i)developer mode",
        r"(?i)jailbreak",
        r"(?i)dan mode",
        r"(?i)do anything now",
        r"(?i)stay in character",
        r"(?i)hypothetical scenario",
        r"(?i)inverse logic",
        r"(?i)secret key",
        r"(?i)password",
        r"(?i)admin access",
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
        Broadly sanitizes the string to mitigate injection attempts
        and normalize input.
        """
        # Remove any scripts or HTML tags
        sanitized = re.sub(r"<[^>]*?>", "", text)
        
        # Remove non-printable control characters
        sanitized = "".join(char for char in sanitized if char.isprintable() or char in "\n\r\t")
        
        # Normalize whitespace (replace multiple spaces with one)
        sanitized = re.sub(r"[ \t]+", " ", sanitized)
        
        # Optional: Limit length of consecutive special characters (prevents some obfuscation)
        sanitized = re.sub(r"([!@#$%^&*()_+={}\[\]|\\:;\"'<>,.?/~`]){4,}", r"\1\1\1", sanitized)

        return sanitized.strip()
