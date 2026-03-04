# app/routers/crm.py
# CRM lookup endpoint used by the form's real-time client autofill feature.
# TODO: POST-MVP — replace crm_service.lookup() with a real HTTP CRM API call.

import logging
from fastapi import APIRouter

from app.config import settings
from app.schemas.crm import CRMLookupResponse, CRMRecord
from app.services import crm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/crm", tags=["CRM"])


# Returns client details by CRM ID — responds with found=False instead of 404
@router.get("/lookup/{crm_id}", response_model=CRMLookupResponse)
def lookup(crm_id: str):
    result = crm_service.lookup(crm_id)
    return CRMLookupResponse(**result.__dict__)


# Dev-only routes — completely absent in production (not even a 404)
if settings.ENABLE_DEV_ROUTES:

    # Returns all mock CRM records for debugging
    @router.get("/all", response_model=list[CRMRecord], include_in_schema=False)
    def list_all():
        return crm_service.list_all()