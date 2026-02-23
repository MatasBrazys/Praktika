"""
CRM Lookup Router
Mocks an external CRM system. In production, replace the data layer
with an actual HTTP call to your CRM's REST API.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.mock_crm_data import MOCK_CRM_DB

router = APIRouter(prefix="/api/crm", tags=["CRM Lookup"])


class CRMRecord(BaseModel):
    crm_id: str
    name: str
    street: str
    postcode: str
    state: str


class CRMLookupResponse(BaseModel):
    found: bool
    crm_id: str
    name: str = ""
    street: str = ""
    postcode: str = ""
    state: str = ""


@router.get("/lookup/{crm_id}", response_model=CRMLookupResponse)
def lookup_crm_client(crm_id: str):
    """
    Look up a client by CRM ID.
    Returns client details (name, street, postcode, state) if found.

    Mock IDs to test: CRM001 through CRM020
    """
    normalised = crm_id.strip().upper()
    record = MOCK_CRM_DB.get(normalised)

    if not record:
        return CRMLookupResponse(found=False, crm_id=normalised)

    return CRMLookupResponse(
        found=True,
        crm_id=normalised,
        **record,
    )


@router.get("/all", response_model=list[CRMRecord])
def list_all_crm_records():
    """
    Dev/testing endpoint – returns all mock CRM records.
    Remove or protect this in production.
    """
    return [
        CRMRecord(crm_id=crm_id, **data)
        for crm_id, data in MOCK_CRM_DB.items()
    ]