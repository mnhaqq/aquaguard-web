from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ReadingMixin:
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    device_name: Mapped[str] = mapped_column(String(64), default="")
    health_score: Mapped[float] = mapped_column(Float, default=0.0)
    water_level: Mapped[float] = mapped_column(Float, default=0.0)
    water_temp: Mapped[float] = mapped_column(Float, default=0.0)
    ph: Mapped[float] = mapped_column(Float, default=0.0)
    tds: Mapped[float] = mapped_column(Float, default=0.0)
    turbidity: Mapped[float] = mapped_column(Float, default=0.0)
    # Display-only strings from the device's NTP-derived TimeManager — not
    # parsed for ordering/charting, received_at (server clock) is used for that.
    date_str: Mapped[str] = mapped_column(String(32), default="")
    timestamp_str: Mapped[str] = mapped_column(String(32), default="")
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class Reading(ReadingMixin, Base):
    """Real sensor readings received from the device over MQTT."""

    __tablename__ = "readings"


class FakeReading(ReadingMixin, Base):
    """Simulated readings for demo mode, generated continuously in the background."""

    __tablename__ = "fake_readings"


class DeviceEvent(Base):
    """Status / command-response / error messages received from the device over MQTT."""

    __tablename__ = "device_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic: Mapped[str] = mapped_column(String(128))
    payload: Mapped[dict] = mapped_column(JSONB)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


class AppSettings(Base):
    """Single-row table of app-wide toggles.

    `mode` is one of:
      - "normal"        — dashboard shows real device data (from `readings`)
      - "demo_active"   — dashboard shows fake data; the generator keeps
                          appending new simulated readings
      - "demo_inactive" — dashboard still shows fake data, but the generator
                          is paused — whatever's in `fake_readings` is frozen
    """

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    mode: Mapped[str] = mapped_column(String(20), default="normal")
