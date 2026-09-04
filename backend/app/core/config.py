from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "xray-proxy"
    app_version: str = "0.1.0"
    api_v1_prefix: str = "/api/v1"
    
    # Database
    database_url: str = Field(
        default="sqlite+aiosqlite:///./xray_proxy.db",
        description="Async SQLite database connection string",
    )

    # Security
    secret_key: str = Field(
        default="dev-insecure-secret-key-change-in-production-32chars",
        description="JWT secret key",
    )
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days

    # CORS
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
        ],
        description="Allowed CORS origins",
    )


settings: Settings = Settings()
