from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import mqtt_client
from ..db import get_db
from ..models import FakeReading, Reading
from ..schemas import ReadingOut
from ..settings_store import get_mode

router = APIRouter(prefix="/api/readings", tags=["readings"])


def _to_out(row, source: str) -> ReadingOut:
    return ReadingOut(
        device_name=row.device_name,
        health_score=row.health_score,
        water_level=row.water_level,
        water_temp=row.water_temp,
        ph=row.ph,
        tds=row.tds,
        turbidity=row.turbidity,
        date_str=row.date_str,
        timestamp_str=row.timestamp_str,
        received_at=row.received_at,
        source=source,
    )


@router.get("/latest", response_model=ReadingOut)
def get_latest_reading(db: Session = Depends(get_db)) -> ReadingOut:
    mode = get_mode(db)

    if mode != "normal":
        row = db.execute(
            select(FakeReading).order_by(FakeReading.received_at.desc()).limit(1)
        ).scalar_one_or_none()
        if row is None:
            raise HTTPException(404, "No fake readings yet — switch to demo_active to generate some")
        return _to_out(row, source=mode)

    cached = mqtt_client.get_latest_cached_reading()
    if cached is not None:
        return ReadingOut(**cached)

    row = db.execute(select(Reading).order_by(Reading.received_at.desc()).limit(1)).scalar_one_or_none()
    if row is None:
        raise HTTPException(404, "No readings received from the device yet")
    return _to_out(row, source="normal")


@router.get("", response_model=list[ReadingOut])
def get_reading_history(
    db: Session = Depends(get_db),
    from_: datetime | None = Query(None, alias="from"),
    to: datetime | None = Query(None),
    limit: int = Query(500, gt=0, le=5000),
) -> list[ReadingOut]:
    mode = get_mode(db)
    model = FakeReading if mode != "normal" else Reading

    stmt = select(model)
    if from_ is not None:
        stmt = stmt.where(model.received_at >= from_)
    if to is not None:
        stmt = stmt.where(model.received_at <= to)
    stmt = stmt.order_by(model.received_at.desc()).limit(limit)

    rows = db.execute(stmt).scalars().all()
    return [_to_out(row, source=mode) for row in reversed(rows)]
