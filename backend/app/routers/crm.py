# app/routers/crm.py

from fastapi import APIRouter
from app.schemas.crm import CRMLookupResponse, CRMRecord
from app.services import crm_service

router = APIRouter(prefix="/api/crm", tags=["CRM"])


@router.get("/lookup/{crm_id}", response_model=CRMLookupResponse)
def lookup(crm_id: str):
    """Look up client by CRM ID. Test IDs: CRM001–CRM020"""
    result = crm_service.lookup(crm_id)
    return CRMLookupResponse(**result.__dict__)


@router.get("/all", response_model=list[CRMRecord])
def list_all():
    """Dev only — remove in production."""
    return crm_service.list_all()