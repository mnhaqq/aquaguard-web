from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    device_id: str = "ESP32_AquaGuard"

    mqtt_host: str = "broker.hivemq.com"
    mqtt_port: int = 1883

    database_url: str = "postgresql+psycopg://aquaguard:aquaguard@localhost:5439/aquaguard"

    fake_data_interval_seconds: int = 30

    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def topic_readings(self) -> str:
        return f"aqua/{self.device_id}/data/readings"

    @property
    def topic_status(self) -> str:
        return f"aqua/{self.device_id}/status"

    @property
    def topic_response(self) -> str:
        return f"aqua/{self.device_id}/response"

    @property
    def topic_error(self) -> str:
        return f"aqua/{self.device_id}/error"

    @property
    def topic_cmd(self) -> str:
        return f"aqua/{self.device_id}/cmd"


settings = Settings()
