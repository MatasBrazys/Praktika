from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database settings
    DATABASE_URL: str
    
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 100
    CORS_ORIGINS: str
    
    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> List[str]:
        """Konvertuoja 'url1,url2' → ['url1', 'url2']"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]


settings = Settings()