import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import mqtt_client
from .config import settings
from .db import Base, engine
from .fake_data import run_fake_data_generator
from .routers import commands, events, mode, readings, status

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    mqtt_client.start()
    fake_data_task = asyncio.create_task(run_fake_data_generator())

    yield

    fake_data_task.cancel()
    mqtt_client.stop()


app = FastAPI(title="AquaGuard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(readings.router)
app.include_router(events.router)
app.include_router(status.router)
app.include_router(mode.router)
app.include_router(commands.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
