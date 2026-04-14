# app/services/lookup_service.py
# Business logic for lookup config management and external API proxying.

import logging
from typing import Optional
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.lookup import LookupConfig
from app.schemas.lookup import (
    LookupConfigCreate,
    LookupConfigUpdate,
    LookupQueryResult,
)

logger = logging.getLogger(__name__)

PROXY_TIMEOUT = 10.0
MAX_RESULTS = 20


# ── CRUD ───────────────────────────────────────────────────────────────────

def get_all(db: Session, active_only: bool = False) -> list[LookupConfig]:
    query = db.query(LookupConfig)
    if active_only:
        query = query.filter(LookupConfig.is_active == True)
    return query.order_by(LookupConfig.name).all()


def get_by_id(db: Session, config_id: int) -> LookupConfig:
    config = db.query(LookupConfig).filter(LookupConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Lookup config not found")
    return config


def create(db: Session, data: LookupConfigCreate) -> LookupConfig:
    config = LookupConfig(
        **data.model_dump(exclude={"field_mappings"}),
        field_mappings=[m.model_dump() for m in data.field_mappings],
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    logger.info("Lookup config created: id=%d name=%r", config.id, config.name)
    return config


def update(db: Session, config_id: int, data: LookupConfigUpdate) -> LookupConfig:
    config = get_by_id(db, config_id)
    updates = data.model_dump(exclude_unset=True)

    if "field_mappings" in updates and updates["field_mappings"] is not None:
        updates["field_mappings"] = [
            m.model_dump() if hasattr(m, "model_dump") else m
            for m in updates["field_mappings"]
        ]

    for field_name, new_value in updates.items():
        setattr(config, field_name, new_value)

    db.commit()
    db.refresh(config)
    logger.info("Lookup config updated: id=%d fields=%s", config.id, list(updates.keys()))
    return config


def delete(db: Session, config_id: int) -> dict:
    config = get_by_id(db, config_id)
    db.delete(config)
    db.commit()
    logger.warning("Lookup config deleted: id=%d name=%r", config_id, config.name)
    return {"message": "Lookup config deleted", "id": config_id}


# ── Proxy — external API call ──────────────────────────────────────────────

async def proxy_query(db: Session, config_id: int, query: str) -> dict:
    config = get_by_id(db, config_id)

    if not config.is_active:
        raise HTTPException(status_code=400, detail="Lookup config is disabled")

    encoded_query = quote(query, safe="")
    endpoint = config.search_endpoint.replace("{query}", encoded_query)
    url = f"{config.base_url}{endpoint}"

    headers = _build_auth_headers(config)
    headers["Accept"] = "application/json"

    logger.info("Lookup proxy: config=%d query=%r url=%s", config_id, query, url[:80])


    try:
        async with httpx.AsyncClient(timeout=PROXY_TIMEOUT, verify=False) as client: #verify = true for verifying if its self signed CA, but corbox is self signed so we leave it false :)
            if config.search_method.upper() == "POST":
                response = await client.post(url, headers=headers)
            else:
                response = await client.get(url, headers=headers)

        if response.status_code != 200:
            logger.warning("Lookup proxy error: config=%d status=%d", config_id, response.status_code)
            return {"found": False, "results": [], "error": f"API returned {response.status_code}"}

        data = response.json()
        results_raw = _extract_results(data, config.results_path)

        if not isinstance(results_raw, list):
            results_raw = [results_raw] if results_raw else []

        results = []
        for item in results_raw[:MAX_RESULTS]:
            if not isinstance(item, dict):
                continue
            results.append(LookupQueryResult(
                value=str(_get_nested(item, config.value_field, "")),
                display=str(_get_nested(item, config.display_field, "")),
                fields=_map_fields(item, config.field_mappings or []),
            ))

        return {"found": len(results) > 0, "results": [r.model_dump() for r in results]}

    except httpx.TimeoutException:
        return {"found": False, "results": [], "error": "External API timeout"}
    except httpx.RequestError as e:
        return {"found": False, "results": [], "error": f"{type(e).__name__}: {str(e)[:300]}"}
    except Exception as e:
        logger.error("Lookup proxy error: %s", str(e)[:200])
        return {"found": False, "results": [], "error": "Lookup failed"}


# ── Test connection ────────────────────────────────────────────────────────

async def test_connection(db: Session, config_id: int) -> dict:
    config = get_by_id(db, config_id)
    sample = (config.test_query or "").strip()
    if not sample:
        return {"success": False, "error": "Set a Test Query first (e.g. CRM001)"}

    result = await proxy_query(db, config_id, sample)
    if result.get("error"):
        return {"success": False, "error": result["error"]}
    return {"success": True, "sample_count": len(result.get("results", []))}


# ── Discover fields ───────────────────────────────────────────────────────

async def discover_fields(db: Session, config_id: int) -> dict:
    config = get_by_id(db, config_id)
    sample = (config.test_query or "").strip()
    if not sample:
        return {"fields": [], "error": "Set a Test Query first (e.g. CRM001) so Discover knows what to search for."}

    encoded = quote(sample, safe="")
    endpoint = config.search_endpoint.replace("{query}", encoded)
    url = f"{config.base_url}{endpoint}"
    headers = _build_auth_headers(config)
    headers["Accept"] = "application/json"

    try:
        async with httpx.AsyncClient(timeout=PROXY_TIMEOUT, verify=False) as client: #verify = true for verifying if its self signed CA, but corbox is self signed so we leave it false :)
            if config.search_method.upper() == "POST":
                response = await client.post(url, headers=headers)
            else:
                response = await client.get(url, headers=headers)

        if response.status_code != 200:
            return {"fields": [], "error": f"API returned {response.status_code}"}

        data = response.json()
        results_raw = _extract_results(data, config.results_path)

        if not isinstance(results_raw, list) or not results_raw:
            return {"fields": [], "error": f"No results for test query \"{sample}\". Check the query and search endpoint."}

        sample_item = results_raw[0]
        if not isinstance(sample_item, dict):
            return {"fields": [], "error": "First result is not a JSON object"}

        fields = _flatten_fields(sample_item)
        return {"fields": fields}

    except httpx.TimeoutException:
        return {"fields": [], "error": "External API timeout"}
    except httpx.RequestError as e:
        return {"fields": [], "error": f"Connection error: {str(e)[:100]}"}
    except Exception as e:
        return {"fields": [], "error": f"Discovery failed: {str(e)[:100]}"}


# ── Private helpers ────────────────────────────────────────────────────────

def _build_auth_headers(config: LookupConfig) -> dict:
    headers = {}
    if config.auth_type == "bearer" and config.auth_token:
        headers["Authorization"] = f"Bearer {config.auth_token}"
    elif config.auth_type == "header" and config.auth_header_name and config.auth_token:
        headers[config.auth_header_name] = config.auth_token
    elif config.auth_type == "basic" and config.auth_token:
        import base64
        encoded = base64.b64encode(config.auth_token.encode()).decode()
        headers["Authorization"] = f"Basic {encoded}"
    return headers


def _extract_results(data, results_path: Optional[str]):
    if not results_path:
        return data
    current = data
    for key in results_path.split("."):
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return []
    return current


def _get_nested(obj: dict, path: str, default=""):
    current = obj
    for key in path.split("."):
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return current if current is not None else default


def _map_fields(item: dict, field_mappings: list) -> dict:
    result = {}
    for mapping in field_mappings:
        key = mapping.get("key", "") if isinstance(mapping, dict) else mapping.key
        label = mapping.get("label", key) if isinstance(mapping, dict) else mapping.label
        result[key] = str(_get_nested(item, key, ""))
    return result


def _flatten_fields(obj: dict, prefix: str = "", max_depth: int = 4) -> list[dict]:
    fields = []
    for key, value in obj.items():
        path = f"{prefix}.{key}" if prefix else key

        if value is None:
            fields.append({"path": path, "sample_value": "", "type": "null"})
        elif isinstance(value, dict):
            if max_depth > 0:
                fields.extend(_flatten_fields(value, path, max_depth - 1))
            else:
                fields.append({"path": path, "sample_value": "{...}", "type": "object"})
        elif isinstance(value, list):
            fields.append({"path": path, "sample_value": f"[{len(value)} items]", "type": "array"})
        elif isinstance(value, bool):
            fields.append({"path": path, "sample_value": str(value).lower(), "type": "boolean"})
        elif isinstance(value, (int, float)):
            fields.append({"path": path, "sample_value": str(value), "type": "number"})
        else:
            fields.append({"path": path, "sample_value": str(value)[:100], "type": "string"})
    return fields