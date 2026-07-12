from sqlalchemy.orm import Session

from .models import AppSettings

VALID_MODES = ("normal", "demo_active", "demo_inactive")


def get_app_settings(db: Session) -> AppSettings:
    row = db.get(AppSettings, 1)
    if row is None:
        row = AppSettings(id=1, mode="normal")
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def get_mode(db: Session) -> str:
    return get_app_settings(db).mode


def set_mode(db: Session, mode: str) -> AppSettings:
    row = get_app_settings(db)
    row.mode = mode
    db.commit()
    db.refresh(row)
    return row


def uses_fake_data(db: Session) -> bool:
    """True for demo_active/demo_inactive — either way the dashboard reads
    from fake_readings; only demo_active also keeps generating new rows."""
    return get_mode(db) != "normal"
