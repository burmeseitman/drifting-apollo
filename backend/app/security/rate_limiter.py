from collections import defaultdict, deque
from threading import Lock
import time


class InMemoryRateLimiter:
    def __init__(self):
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def hit(self, key: str, limit: int, window_seconds: int) -> int | None:
        now = time.monotonic()
        cutoff = now - window_seconds

        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= limit:
                retry_after = max(1, int(window_seconds - (now - events[0])))
                return retry_after

            events.append(now)
            return None

    def clear(self, key: str):
        with self._lock:
            self._events.pop(key, None)


auth_rate_limiter = InMemoryRateLimiter()
