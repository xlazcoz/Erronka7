"""Saio-hasieraren aurkako abiadura-muga (rate limiting) arina.

Memorian funtzionatzen du, prozesu bakarreko hedapenerako. Produkzioan
prozesu anitz badituzu, erabili Redis edo antzeko biltegi partekatua.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field

from config import LOGIN_BLOCK_SECONDS, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW_SECONDS

_MAX_TRACKED_KEYS = 10_000


@dataclass
class _Entry:
    failures: list[float] = field(default_factory=list)
    blocked_until: float = 0.0


class LoginRateLimiter:
    """Porrot egindako saio-hasierak zenbatzen ditu eta blokeatu egiten du."""

    def __init__(
        self,
        max_attempts: int | None = None,
        window_seconds: int | None = None,
        block_seconds: int | None = None,
    ) -> None:
        self.max_attempts = max_attempts or LOGIN_MAX_ATTEMPTS
        self.window_seconds = window_seconds or LOGIN_WINDOW_SECONDS
        self.block_seconds = block_seconds or LOGIN_BLOCK_SECONDS
        self._entries: dict[str, _Entry] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _now() -> float:
        return time.monotonic()

    def _prune(self, entry: _Entry, now: float) -> None:
        entry.failures = [
            timestamp
            for timestamp in entry.failures
            if now - timestamp < self.window_seconds
        ]

    def blocked_for(self, key: str) -> int:
        """Itzuli blokeoak irauten duen segundo kopurua (0 = ez dago blokeatuta)."""
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return 0

            now = self._now()
            if entry.blocked_until > now:
                return max(1, int(entry.blocked_until - now + 0.999))

            self._prune(entry, now)
            if not entry.failures:
                self._entries.pop(key, None)
            return 0

    def record_failure(self, key: str) -> int:
        """Erregistratu porrot bat eta itzuli saiakera-kopurua."""
        with self._lock:
            now = self._now()
            if len(self._entries) >= _MAX_TRACKED_KEYS:
                self._entries = {
                    stored_key: entry
                    for stored_key, entry in self._entries.items()
                    if entry.blocked_until > now
                    or any(now - timestamp < self.window_seconds for timestamp in entry.failures)
                }

            entry = self._entries.setdefault(key, _Entry())
            self._prune(entry, now)
            entry.failures.append(now)

            if len(entry.failures) >= self.max_attempts:
                entry.blocked_until = now + self.block_seconds
                entry.failures.clear()

            return len(entry.failures)

    def reset(self, key: str) -> None:
        with self._lock:
            self._entries.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()


login_rate_limiter = LoginRateLimiter()

# IP beretik email desberdinekin egindako erasoak ere moteltzeko.
ip_rate_limiter = LoginRateLimiter(
    max_attempts=max(LOGIN_MAX_ATTEMPTS * 4, 20),
    window_seconds=LOGIN_WINDOW_SECONDS,
    block_seconds=LOGIN_BLOCK_SECONDS,
)
