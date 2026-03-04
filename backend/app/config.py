# app/config.py
# Application settings loaded from .env file via pydantic-settings.

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 100

    CORS_ORIGINS: str

    # Keep False in production — enables seed and debug endpoints when True
    ENABLE_DEV_ROUTES: bool = True

    class Config:
        env_file = ".env"

    # Converts "url1,url2" string into ["url1", "url2"] list for CORSMiddleware
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()