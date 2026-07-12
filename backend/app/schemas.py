from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

AppMode = Literal["normal", "demo_active", "demo_inactive"]


class ReadingOut(BaseModel):
    device_name: str
    health_score: float
    water_level: float
    water_temp: float
    ph: float
    tds: float
    turbidity: float
    date_str: str
    timestamp_str: str
    received_at: datetime
    source: AppMode

    model_config = {"from_attributes": True}


class EventOut(BaseModel):
    id: int
    topic: str
    payload: dict[str, Any]
    received_at: datetime

    model_config = {"from_attributes": True}


class StatusOut(BaseModel):
    mqtt_connected: bool
    data_source: AppMode
    mode: str | None = None
    last_seen: datetime | None = None


class ModeOut(BaseModel):
    mode: AppMode


class ModeIn(BaseModel):
    mode: AppMode


class AutomationIn(BaseModel):
    enter: bool


class PumpIn(BaseModel):
    pump: Literal["pump_in", "pump_out"]
    state: bool


class TankHeightIn(BaseModel):
    tank_height: float = Field(gt=0, le=5000)


class WaterLevelMarkIn(BaseModel):
    water_level_mark: float = Field(gt=0, le=5000)


class CommandAck(BaseModel):
    published: dict[str, Any]
