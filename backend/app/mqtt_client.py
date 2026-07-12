import json
import logging
import threading
from typing import Any

import paho.mqtt.client as mqtt

from .config import settings
from .db import SessionLocal
from .models import DeviceEvent, Reading

logger = logging.getLogger("aquaguard.mqtt")

_lock = threading.Lock()
_latest_reading: dict[str, Any] | None = None
_client: mqtt.Client | None = None
_connected = False


def get_latest_cached_reading() -> dict[str, Any] | None:
    with _lock:
        return _latest_reading


def is_connected() -> bool:
    return _connected


def _reading_from_payload(payload: dict[str, Any]) -> Reading:
    # Field names match Mode::sendDataToServer() in lib/Mode/Mode.cpp exactly.
    return Reading(
        device_name=str(payload.get("Device_name", "")),
        health_score=float(payload.get("HealthScore", 0.0) or 0.0),
        water_level=float(payload.get("Water_Level", 0.0) or 0.0),
        water_temp=float(payload.get("Water_Temperature", 0.0) or 0.0),
        ph=float(payload.get("pH", 0.0) or 0.0),
        tds=float(payload.get("TDS", 0.0) or 0.0),
        turbidity=float(payload.get("Turbidity", 0.0) or 0.0),
        date_str=str(payload.get("Date", "")),
        timestamp_str=str(payload.get("Timestamp", "")),
    )


def _handle_reading(payload: dict[str, Any]) -> None:
    global _latest_reading

    db = SessionLocal()
    try:
        reading = _reading_from_payload(payload)
        db.add(reading)
        db.commit()
        db.refresh(reading)
        cached = {
            "device_name": reading.device_name,
            "health_score": reading.health_score,
            "water_level": reading.water_level,
            "water_temp": reading.water_temp,
            "ph": reading.ph,
            "tds": reading.tds,
            "turbidity": reading.turbidity,
            "date_str": reading.date_str,
            "timestamp_str": reading.timestamp_str,
            "received_at": reading.received_at,
            "source": "normal",
        }
        with _lock:
            _latest_reading = cached
    finally:
        db.close()


def _handle_event(topic: str, payload: dict[str, Any]) -> None:
    db = SessionLocal()
    try:
        db.add(DeviceEvent(topic=topic, payload=payload))
        db.commit()
    finally:
        db.close()


def _on_connect(client: mqtt.Client, userdata, flags, reason_code, properties=None) -> None:
    global _connected
    _connected = reason_code == 0
    if not _connected:
        logger.error("MQTT connect failed: %s", reason_code)
        return

    logger.info("MQTT connected to %s:%s", settings.mqtt_host, settings.mqtt_port)
    for topic in (
        settings.topic_readings,
        settings.topic_status,
        settings.topic_response,
        settings.topic_error,
    ):
        client.subscribe(topic)
        logger.info("Subscribed to %s", topic)


def _on_disconnect(client: mqtt.Client, userdata, flags, reason_code, properties=None) -> None:
    global _connected
    _connected = False
    logger.warning("MQTT disconnected: %s", reason_code)


def _on_message(client: mqtt.Client, userdata, msg: mqtt.MQTTMessage) -> None:
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        logger.warning("Ignoring non-JSON message on %s", msg.topic)
        return

    try:
        if msg.topic == settings.topic_readings:
            _handle_reading(payload)
        else:
            _handle_event(msg.topic, payload)
    except Exception:
        logger.exception("Failed to handle message on %s", msg.topic)


def start() -> None:
    global _client
    if _client is not None:
        return

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="aquaguard-backend")
    client.on_connect = _on_connect
    client.on_disconnect = _on_disconnect
    client.on_message = _on_message

    client.connect_async(settings.mqtt_host, settings.mqtt_port)
    client.loop_start()

    _client = client


def stop() -> None:
    global _client, _connected
    if _client is None:
        return
    _client.loop_stop()
    _client.disconnect()
    _client = None
    _connected = False


def publish_command(payload: dict[str, Any]) -> None:
    if _client is None:
        raise RuntimeError("MQTT client not started")
    _client.publish(settings.topic_cmd, json.dumps(payload))
