# app/schemas/crm.py

from pydantic import BaseModel


class CRMLookupResponse(BaseModel):
    found: bool
    crm_id: str
    name: str = ""
    street: str = ""
    postcode: str = ""
    state: str = ""


class CRMRecord(BaseModel):
    crm_id: str
    name: str
    street: str
    postcode: str
    state: str