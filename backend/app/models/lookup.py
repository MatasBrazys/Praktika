# app/models/lookup.py
# Stores external API lookup configurations.
# Admin creates these via UI — credentials never reach the frontend.

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class LookupConfig(Base):
    """Admin-configured external API lookup endpoint."""
    __tablename__ = "lookup_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)              # "Netbox Devices", "CRM System"
    description = Column(Text, nullable=True)

    # ── API connection ────────────────────────────────────────────────────
    base_url = Column(String(1024), nullable=False)         # "https://netbox.company.com"
    search_endpoint = Column(String(1024), nullable=False)  # "/api/dcim/devices/?name__ic={query}"
    search_method = Column(String(10), default="GET")       # GET or POST

    # ── Authentication ────────────────────────────────────────────────────
    auth_type = Column(String(50), default="none")          # "none", "bearer", "header", "basic"
    auth_token = Column(Text, nullable=True)                # token / password value
    auth_header_name = Column(String(255), nullable=True)   # custom header name (e.g. "X-API-Key")

    # ── Response parsing ──────────────────────────────────────────────────
    results_path = Column(String(255), nullable=True)       # dot-path to results array: "results", "data.items"
    value_field = Column(String(255), default="id")         # which field is the unique ID
    display_field = Column(String(255), default="name")     # which field to show in Found: message

    # ── Testing ───────────────────────────────────────────────────────────
    test_query = Column(String(255), nullable=True)         # sample query for Test + Discover (e.g. "CRM001")

    # ── Field mappings ────────────────────────────────────────────────────
    field_mappings = Column(JSON, default=list)

    # ── Meta ──────────────────────────────────────────────────────────────
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())