# app/routers/lookup.py
# Lookup config management (admin) and proxy query (any authenticated user).

import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.lookup import (
    LookupConfigCreate,
    LookupConfigUpdate,
    LookupConfigResponse,
    LookupQueryRequest,
    LookupQueryResponse,
)
from app.services import lookup_service
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/lookup", tags=["Lookup"])


def _to_response(config) -> dict:
    return {
        "id": config.id,
        "name": config.name,
        "description": config.description,
        "base_url": config.base_url,
        "search_endpoint": config.search_endpoint,
        "search_method": config.search_method,
        "auth_type": config.auth_type,
        "has_token": bool(config.auth_token),
        "auth_header_name": config.auth_header_name,
        "results_path": config.results_path,
        "value_field": config.value_field,
        "display_field": config.display_field,
        "test_query": config.test_query,
        "field_mappings": config.field_mappings or [],
        "is_active": config.is_active,
        "created_at": config.created_at,
        "updated_at": config.updated_at,
    }


@router.get("/configs", response_model=List[LookupConfigResponse])
def list_configs(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [_to_response(c) for c in lookup_service.get_all(db)]


@router.get("/configs/active", response_model=List[LookupConfigResponse])
def list_active_configs(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return [_to_response(c) for c in lookup_service.get_all(db, active_only=True)]


@router.get("/configs/{config_id}", response_model=LookupConfigResponse)
def get_config(config_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return _to_response(lookup_service.get_by_id(db, config_id))


@router.post("/configs", response_model=LookupConfigResponse)
def create_config(data: LookupConfigCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    logger.info("Admin id=%d creating lookup config: %r", current_user.id, data.name)
    return _to_response(lookup_service.create(db, data))


@router.put("/configs/{config_id}", response_model=LookupConfigResponse)
def update_config(config_id: int, data: LookupConfigUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    logger.info("Admin id=%d updating lookup config id=%d", current_user.id, config_id)
    return _to_response(lookup_service.update(db, config_id, data))


@router.delete("/configs/{config_id}")
def delete_config(config_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    logger.warning("Admin id=%d deleting lookup config id=%d", current_user.id, config_id)
    return lookup_service.delete(db, config_id)


@router.post("/configs/{config_id}/test")
async def test_config(config_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return await lookup_service.test_connection(db, config_id)


@router.post("/configs/{config_id}/discover-fields")
async def discover_fields(config_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return await lookup_service.discover_fields(db, config_id)


@router.post("/query", response_model=LookupQueryResponse)
async def query_lookup(body: LookupQueryRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    logger.info("User id=%d querying lookup config=%d query=%r", current_user.id, body.config_id, body.query[:50])
    return await lookup_service.proxy_query(db, body.config_id, body.query)