# aquaguard-web

Dashboard, history charts, and remote controls for the AquaGuard ESP32 tank monitor. Talks to the
device over the same MQTT broker (`broker.hivemq.com`) the firmware already uses — see
`../Aqua-Guard/AQUAGUARD_DOCUMENTATION_2_.md` and `../CLAUDE.md` for the device side.

- `backend/` — FastAPI, subscribes to the device's MQTT topics, stores readings in Postgres,
  exposes a REST API, publishes commands back to the device.
- `frontend/` — React + Vite, polls the backend over HTTP.

## Prerequisites

- Docker (for Postgres)
- Python 3.12+
- Node 20+

## First-time setup

```bash
# 1. Database
cd web
docker compose up -d db

# 2. Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env   # defaults work out of the box; edit DEVICE_ID if you've provisioned one

# 3. Frontend
cd ../frontend
npm install
```

`backend/.env` already has sane defaults (points at the public HiveMQ broker and the local Docker
Postgres). The one field worth checking is `DEVICE_ID` — it must match whatever's actually
provisioned on the real ESP32, otherwise the backend is listening to the wrong MQTT topics. It
defaults to the firmware's own fallback (`ESP32_AquaGuard`), which is what the device uses if it
hasn't been BLE-provisioned with a custom ID.

## Running

Three terminals:

```bash
# Terminal 1 — database (only needed once; stays running in the background)
cd web && docker compose up -d db

# Terminal 2 — backend
cd web/backend && .venv/bin/uvicorn app.main:app --reload --port 8000

# Terminal 3 — frontend
cd web/frontend && npm run dev
```

Then open **http://localhost:5173**.

- API docs (Swagger UI): http://localhost:8000/api/health confirms it's up; full interactive docs
  at http://localhost:8000/docs
- The backend connects to `broker.hivemq.com` automatically on startup — nothing else to run for
  MQTT.

No hardware handy? The backend has three data-source modes, controlled entirely from the backend
(there's no UI for this — by design, so it's indistinguishable from the frontend):

```bash
curl localhost:8000/api/mode                                          # check current mode
curl -X POST localhost:8000/api/mode -H 'Content-Type: application/json' -d '{"mode": "demo_active"}'
```

| Mode | Dashboard shows | Generator |
|---|---|---|
| `normal` (default) | Real device data (`readings` table) | n/a |
| `demo_active` | Simulated data | Running — appends a new plausible reading every `FAKE_DATA_INTERVAL_SECONDS` |
| `demo_inactive` | Simulated data | Paused — dashboard keeps showing whatever was already generated, frozen |

Command buttons (Controls page) always publish real MQTT commands to the device regardless of mode.

## Stopping

- Backend / frontend: `Ctrl+C` in their terminals.
- Database: `docker compose down` (from `web/`). Add `-v` only if you want to wipe stored readings
  too — omit it to keep your data across restarts.

## Configuration reference (`backend/.env`)

| Variable | Default | Meaning |
|---|---|---|
| `DEVICE_ID` | `ESP32_AquaGuard` | Must match the device's provisioned ID — determines the MQTT topics subscribed/published to (`aqua/{DEVICE_ID}/...`) |
| `MQTT_HOST` | `broker.hivemq.com` | Same broker the firmware connects to |
| `MQTT_PORT` | `1883` | Plaintext MQTT — matches the firmware, not the TLS port described in the docs (see `../CLAUDE.md` for the discrepancy) |
| `DATABASE_URL` | Docker Postgres on `localhost:5439` | SQLAlchemy connection string |
| `FAKE_DATA_INTERVAL_SECONDS` | `10` | How often new readings are generated while mode is `demo_active` |
| `CORS_ORIGINS` | `http://localhost:5173` | Origins allowed to call the API from a browser |

## Verifying it's working without real hardware

Simulate the ESP32 publishing a reading (requires the backend running and `paho-mqtt` installed —
already a backend dependency):

```bash
cd web/backend
.venv/bin/python3 -c "
import json, paho.mqtt.publish as publish
publish.single(
    'aqua/ESP32_AquaGuard/data/readings',
    json.dumps({'Device_name':'AquaGuard_001','Date':'2026-01-01','Timestamp':'12:00:00',
                'HealthScore':90,'Water_Level':380,'Water_Temperature':27.5,
                'pH':7.2,'TDS':500,'Turbidity':2.0}),
    hostname='broker.hivemq.com', port=1883)
"
curl -s localhost:8000/api/readings/latest
```

Adjust the topic's `ESP32_AquaGuard` segment if your `.env` uses a different `DEVICE_ID`.
