from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import DeviceEvent
from ..schemas import EventOut

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventOut])
def get_recent_events(
    db: Session = Depends(get_db),
    limit: int = Query(50, gt=0, le=500),
) -> list[EventOut]:
    rows = db.execute(
        select(DeviceEvent).order_by(DeviceEvent.received_at.desc()).limit(limit)
    ).scalars().all()
    return list(rows)
