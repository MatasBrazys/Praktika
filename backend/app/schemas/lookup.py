# app/schemas/lookup.py
# Pydantic schemas for lookup config management and proxy queries.

from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


# ── Field mapping item ─────────────────────────────────────────────────────

class FieldMapping(BaseModel):
    key: str
    label: str


# ── CRUD schemas ───────────────────────────────────────────────────────────

class LookupConfigBase(BaseModel):
    name: str
    description: Optional[str] = None
    base_url: str
    search_endpoint: str
    search_method: str = "GET"
    auth_type: str = "none"
    auth_token: Optional[str] = None
    auth_header_name: Optional[str] = None
    results_path: Optional[str] = None
    value_field: str = "id"
    display_field: str = "name"
    test_query: Optional[str] = None
    field_mappings: list[FieldMapping] = []

    @field_validator("base_url")
    @classmethod
    def validate_base_url(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @field_validator("search_endpoint")
    @classmethod
    def validate_search_endpoint(cls, v: str) -> str:
        if "{query}" not in v:
            raise ValueError('search_endpoint must contain {query} placeholder')
        return v.strip()

    @field_validator("auth_type")
    @classmethod
    def validate_auth_type(cls, v: str) -> str:
        allowed = ("none", "bearer", "header", "basic")
        if v not in allowed:
            raise ValueError(f"auth_type must be one of: {', '.join(allowed)}")
        return v


class LookupConfigCreate(LookupConfigBase):
    pass


class LookupConfigUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_url: Optional[str] = None
    search_endpoint: Optional[str] = None
    search_method: Optional[str] = None
    auth_type: Optional[str] = None
    auth_token: Optional[str] = None
    auth_header_name: Optional[str] = None
    results_path: Optional[str] = None
    value_field: Optional[str] = None
    display_field: Optional[str] = None
    test_query: Optional[str] = None
    field_mappings: Optional[list[FieldMapping]] = None
    is_active: Optional[bool] = None


class LookupConfigResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    base_url: str
    search_endpoint: str
    search_method: str
    auth_type: str
    has_token: bool
    auth_header_name: Optional[str] = None
    results_path: Optional[str] = None
    value_field: str
    display_field: str
    test_query: Optional[str] = None
    field_mappings: list[FieldMapping]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Proxy query schemas ────────────────────────────────────────────────────

class LookupQueryRequest(BaseModel):
    config_id: int
    query: str

    @field_validator("query")
    @classmethod
    def query_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("query cannot be empty")
        return v.strip()


class LookupQueryResult(BaseModel):
    value: str
    display: str
    fields: dict


class LookupQueryResponse(BaseModel):
    found: bool
    results: list[LookupQueryResult] = []
    error: Optional[str] = None