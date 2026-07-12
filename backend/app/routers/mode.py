from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import ModeIn, ModeOut
from ..settings_store import get_mode, set_mode

router = APIRouter(prefix="/api/mode", tags=["mode"])


@router.get("", response_model=ModeOut)
def get_current_mode(db: Session = Depends(get_db)) -> ModeOut:
    return ModeOut(mode=get_mode(db))


@router.post("", response_model=ModeOut)
def update_mode(body: ModeIn, db: Session = Depends(get_db)) -> ModeOut:
    row = set_mode(db, body.mode)
    return ModeOut(mode=row.mode)
