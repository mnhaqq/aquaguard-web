from typing import Any

from fastapi import APIRouter, HTTPException

from .. import mqtt_client
from ..schemas import AutomationIn, CommandAck, PumpIn, TankHeightIn, WaterLevelMarkIn

router = APIRouter(prefix="/api/commands", tags=["commands"])


def _publish(payload: dict[str, Any]) -> CommandAck:
    try:
        mqtt_client.publish_command(payload)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    return CommandAck(published=payload)


@router.post("/automation", response_model=CommandAck)
def set_automation_mode(body: AutomationIn) -> CommandAck:
    command = "enter_automation" if body.enter else "exit_automation"
    return _publish({"command": command})


@router.post("/pump", response_model=CommandAck)
def control_pump(body: PumpIn) -> CommandAck:
    return _publish({"command": "pump_control", "pump": body.pump, "state": body.state})


@router.post("/tank-height", response_model=CommandAck)
def update_tank_height(body: TankHeightIn) -> CommandAck:
    return _publish({"command": "update_tank_height", "tank_height": body.tank_height})


@router.post("/water-level-mark", response_model=CommandAck)
def update_water_level_mark(body: WaterLevelMarkIn) -> CommandAck:
    return _publish(
        {"command": "update_water_level_mark", "water_level_mark": body.water_level_mark}
    )


@router.post("/factory-reset", response_model=CommandAck)
def factory_reset() -> CommandAck:
    return _publish({"command": "factory_reset"})
