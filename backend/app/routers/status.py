from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import mqtt_client
from ..config import settings
from ..db import get_db
from ..models import DeviceEvent, Reading
from ..schemas import StatusOut
from ..settings_store import get_mode

router = APIRouter(prefix="/api/status", tags=["status"])


@router.get("", response_model=StatusOut)
def get_status(db: Session = Depends(get_db)) -> StatusOut:
    data_source = get_mode(db)

    latest_status_event = db.execute(
        select(DeviceEvent)
        .where(DeviceEvent.topic == settings.topic_status)
        .order_by(DeviceEvent.received_at.desc())
        .limit(1)
    ).scalar_one_or_none()

    mode = latest_status_event.payload.get("mode") if latest_status_event else None

    last_seen_candidates = []
    latest_reading = db.execute(
        select(Reading.received_at).order_by(Reading.received_at.desc()).limit(1)
    ).scalar_one_or_none()
    if latest_reading is not None:
        last_seen_candidates.append(latest_reading)

    latest_event = db.execute(
        select(DeviceEvent.received_at).order_by(DeviceEvent.received_at.desc()).limit(1)
    ).scalar_one_or_none()
    if latest_event is not None:
        last_seen_candidates.append(latest_event)

    last_seen = max(last_seen_candidates) if last_seen_candidates else None

    return StatusOut(
        mqtt_connected=mqtt_client.is_connected(),
        data_source=data_source,
        mode=mode,
        last_seen=last_seen,
    )
