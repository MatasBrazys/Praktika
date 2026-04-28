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
    LDAP_PORT: int = 636
    LDAP_USE_SSL: bool = True
    LDAP_TLS_VERIFY: bool = True
    LDAP_DOMAIN: str = "company.local"
    LDAP_ADMIN_PASSWORD: str = ""
    LDAP_BIND_USER: str = "svc-readonly"
    LDAP_BIND_PASSWORD: str = ""
    LDAP_ADMIN_GROUP: str = "FormAdmin"
    LDAP_USER_GROUP: str = "FormUser"
    LDAP_CONFIRMER_GROUP: str = "FormConfirmer"
    LDAP_CA_CERT_PATH: str = ""

    # LDAP Background Sync
    LDAP_SYNC_INTERVAL_MINUTES: float = 5
    LDAP_SYNC_ENABLED: bool = True

    # App
    APP_URL: str = "http://localhost:5173"

    # Email SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "IT Portal <noreply@company.com>"
    EMAIL_ENABLED: bool = False

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

    @property
    def ldap_bind_dn(self) -> str:
        return f"cn={self.LDAP_BIND_USER},{self.ldap_base_dn}"

    @property
    def ldap_bind_password(self) -> str:
        return self.LDAP_BIND_PASSWORD or self.LDAP_ADMIN_PASSWORD


settings = Settings()