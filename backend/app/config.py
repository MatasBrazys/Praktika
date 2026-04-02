# app/config.py

from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str

    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 8

    CORS_ORIGINS: str

    ENABLE_DEV_ROUTES: bool = True

    # LDAP
    LDAP_HOST: str = "openldap"
    LDAP_PORT: int = 389
    LDAP_DOMAIN: str = "company.local"
    LDAP_ADMIN_PASSWORD: str = ""
    LDAP_ADMIN_GROUP: str = "FormAdmin"
    LDAP_USER_GROUP: str = "FormUser"

    class Config:
        env_file = ".env"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def ldap_base_dn(self) -> str:
        parts = self.LDAP_DOMAIN.split(".")
        return ",".join(f"dc={part}" for part in parts)

    @property
    def ldap_admin_dn(self) -> str:
        return f"cn=admin,{self.ldap_base_dn}"


settings = Settings()