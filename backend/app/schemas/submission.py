# app/schemas/submission.py

from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional, Literal


class SubmissionRequest(BaseModel):
    form_type: str
    data: dict

    @field_validator("form_type")
    @classmethod
    def form_type_cannot_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("form_type cannot be empty")
        return value.strip()

    @field_validator("data")
    @classmethod
    def data_cannot_be_empty(cls, value: dict) -> dict:
        if not value:
            raise ValueError("data cannot be an empty object")
        return value


class SubmissionUpdateRequest(BaseModel):
    data: dict

    @field_validator("data")
    @classmethod
    def data_cannot_be_empty(cls, value: dict) -> dict:
        if not value:
            raise ValueError("data cannot be an empty object")
        return value


class StatusUpdateRequest(BaseModel):
    status: Literal['pending', 'confirmed', 'declined']
    comment: Optional[str] = None


class SubmissionCreate(BaseModel):
    form_id: int
    form_type: str
    data: dict


class SubmissionResponse(BaseModel):
    id: int
    form_id: int
    form_type: str
    data: dict
    status: str = 'pending'
    decline_comment: Optional[str] = None
    submitted_by_username: Optional[str] = None
    submitted_by_email: Optional[str] = None
    updated_by_username: Optional[str] = None
    updated_by_email: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}