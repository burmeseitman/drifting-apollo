from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests

from app.core.config import settings


class LLMGuardUnavailableError(RuntimeError):
    pass


@dataclass(slots=True)
class GuardAnalysis:
    sanitized_text: str
    is_valid: bool
    scanners: dict[str, float]

    def score(self, scanner_name: str) -> float:
        raw_score = self.scanners.get(scanner_name, 0.0)
        try:
            return float(raw_score)
        except (TypeError, ValueError):
            return 0.0


class LLMGuardService:
    def __init__(
        self,
        *,
        enabled: bool | None = None,
        base_url: str | None = None,
        api_token: str | None = None,
        timeout_seconds: float | None = None,
        chunk_size: int | None = None,
    ):
        self.enabled = settings.llm_guard_enabled if enabled is None else enabled
        self.base_url = (base_url or settings.llm_guard_base_url).rstrip("/")
        self.api_token = settings.llm_guard_api_token if api_token is None else api_token
        self.timeout_seconds = (
            settings.llm_guard_timeout_seconds if timeout_seconds is None else timeout_seconds
        )
        self.chunk_size = max(500, settings.llm_guard_chunk_size if chunk_size is None else chunk_size)

    def is_enabled(self) -> bool:
        return self.enabled

    def is_available(self) -> bool:
        if not self.enabled:
            return False

        try:
            response = requests.get(
                f"{self.base_url}/readyz",
                headers=self._headers(),
                timeout=min(self.timeout_seconds, 2),
            )
            response.raise_for_status()
            payload = response.json()
            return payload.get("status") == "ready"
        except Exception:
            return False

    def analyze_prompt(
        self,
        prompt: str,
        *,
        scanners_suppress: list[str] | None = None,
    ) -> GuardAnalysis:
        if not self.enabled:
            return GuardAnalysis(sanitized_text=prompt, is_valid=True, scanners={})

        payload: dict[str, Any] = {"prompt": prompt}
        if scanners_suppress:
            payload["scanners_suppress"] = scanners_suppress

        data = self._post("/analyze/prompt", payload)
        return GuardAnalysis(
            sanitized_text=data.get("sanitized_prompt", prompt),
            is_valid=bool(data.get("is_valid", True)),
            scanners=self._normalize_scanners(data.get("scanners")),
        )

    def analyze_output(
        self,
        *,
        prompt: str,
        output: str,
        scanners_suppress: list[str] | None = None,
    ) -> GuardAnalysis:
        if not self.enabled:
            return GuardAnalysis(sanitized_text=output, is_valid=True, scanners={})

        payload: dict[str, Any] = {
            "prompt": prompt,
            "output": output,
        }
        if scanners_suppress:
            payload["scanners_suppress"] = scanners_suppress

        data = self._post("/analyze/output", payload)
        return GuardAnalysis(
            sanitized_text=data.get("sanitized_output", output),
            is_valid=bool(data.get("is_valid", True)),
            scanners=self._normalize_scanners(data.get("scanners")),
        )

    def analyze_text_chunks(
        self,
        text: str,
        *,
        scanners_suppress: list[str] | None = None,
    ) -> GuardAnalysis:
        if not self.enabled or not text.strip():
            return GuardAnalysis(sanitized_text=text, is_valid=True, scanners={})

        sanitized_chunks: list[str] = []
        merged_scores: dict[str, float] = {}

        for chunk in self._chunk_text(text):
            result = self.analyze_prompt(chunk, scanners_suppress=scanners_suppress)
            merged_scores = self._merge_scores(merged_scores, result.scanners)
            if not result.is_valid:
                return GuardAnalysis(
                    sanitized_text="\n\n".join(sanitized_chunks) if sanitized_chunks else text,
                    is_valid=False,
                    scanners=merged_scores,
                )

            sanitized_chunks.append(result.sanitized_text)

        return GuardAnalysis(
            sanitized_text="\n\n".join(chunk for chunk in sanitized_chunks if chunk.strip()),
            is_valid=True,
            scanners=merged_scores,
        )

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_token:
            headers["Authorization"] = f"Bearer {self.api_token}"
        return headers

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            response = requests.post(
                f"{self.base_url}{path}",
                json=payload,
                headers=self._headers(),
                timeout=self.timeout_seconds,
            )
        except requests.RequestException as exc:
            raise LLMGuardUnavailableError("LLM Guard is unavailable.") from exc

        try:
            data = response.json()
        except ValueError:
            data = {}

        if response.ok:
            return data

        message = data.get("message") or data.get("detail") or "LLM Guard request failed."
        raise LLMGuardUnavailableError(str(message))

    def _chunk_text(self, text: str) -> list[str]:
        normalized = text.strip()
        if len(normalized) <= self.chunk_size:
            return [normalized]

        chunks: list[str] = []
        start = 0
        text_length = len(normalized)

        while start < text_length:
            end = min(start + self.chunk_size, text_length)
            if end < text_length:
                split_at = normalized.rfind(" ", start, end)
                if split_at > start + (self.chunk_size // 2):
                    end = split_at

            chunk = normalized[start:end].strip()
            if chunk:
                chunks.append(chunk)

            start = end

        return chunks or [normalized]

    @staticmethod
    def _normalize_scanners(scanners: Any) -> dict[str, float]:
        if not isinstance(scanners, dict):
            return {}

        normalized: dict[str, float] = {}
        for name, score in scanners.items():
            try:
                normalized[str(name)] = float(score)
            except (TypeError, ValueError):
                continue

        return normalized

    @staticmethod
    def _merge_scores(existing: dict[str, float], new: dict[str, float]) -> dict[str, float]:
        merged = dict(existing)
        for name, score in new.items():
            merged[name] = max(score, merged.get(name, 0.0))
        return merged
