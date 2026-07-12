import asyncio
import logging
import random

from .config import settings
from .db import SessionLocal
from .models import FakeReading
from .settings_store import get_mode

logger = logging.getLogger("aquaguard.fake_data")


def _step(value: float, max_delta: float, lo: float, hi: float) -> float:
    value += random.uniform(-max_delta, max_delta)
    return max(lo, min(hi, value))


class _SimState:
    """Random-walk state so consecutive fake readings drift smoothly instead of jumping."""

    def __init__(self) -> None:
        self.water_temp = 27.5
        self.ph = 7.2
        self.tds = 480.0
        self.turbidity = 1.5
        self.water_level = 350.0
        self.health_score = 88.0

    def tick(self) -> dict:
        self.water_temp = _step(self.water_temp, 0.15, 24.0, 30.0)
        self.ph = _step(self.ph, 0.05, 6.3, 8.5)
        self.tds = _step(self.tds, 8.0, 350.0, 650.0)
        self.water_level = _step(self.water_level, 2.0, 300.0, 400.0)

        # Turbidity mostly drifts low, with an occasional small spike.
        if random.random() < 0.05:
            self.turbidity = min(8.0, self.turbidity + random.uniform(1.5, 4.0))
        else:
            self.turbidity = _step(self.turbidity, 0.3, 0.2, 8.0)

        # Loosely track "how far from ideal" the water quality is.
        penalty = abs(self.ph - 7.2) * 6 + max(0, self.turbidity - 3) * 2
        target_health = max(55.0, 98.0 - penalty)
        self.health_score += (target_health - self.health_score) * 0.2
        self.health_score = _step(self.health_score, 1.0, 55.0, 98.0)

        return {
            "device_name": "AquaGuard_DEMO",
            "health_score": round(self.health_score, 1),
            "water_level": round(self.water_level, 1),
            "water_temp": round(self.water_temp, 2),
            "ph": round(self.ph, 2),
            "tds": round(self.tds, 1),
            "turbidity": round(self.turbidity, 2),
            "date_str": "",
            "timestamp_str": "",
        }


_state = _SimState()


def _generate_if_enabled() -> None:
    db = SessionLocal()
    try:
        # Only "demo_active" advances the simulation. "normal" and
        # "demo_inactive" both leave fake_readings frozen wherever it last
        # was, rather than burning cycles/DB writes nobody's looking at.
        if get_mode(db) != "demo_active":
            return
        db.add(FakeReading(**_state.tick()))
        db.commit()
    finally:
        db.close()


async def run_fake_data_generator() -> None:
    logger.info(
        "Fake data generator loop started (interval=%ss, only writes while demo mode is on)",
        settings.fake_data_interval_seconds,
    )
    while True:
        try:
            await asyncio.to_thread(_generate_if_enabled)
        except Exception:
            logger.exception("Fake data generation tick failed")
        await asyncio.sleep(settings.fake_data_interval_seconds)
