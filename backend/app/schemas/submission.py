# app/schemas/submission.py
# Pydantic schemas for form submission validation and serialization.

from pydantic import BaseModel, field_validator
from datetime import datetime


# Incoming submission request from the frontend
class SubmissionRequest(BaseModel):
    form_type: str
    data: dict

    # Rejects empty form_type — "unknown" is no longer silently accepted
    @field_validator("form_type")
    @classmethod
    def form_type_cannot_be_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("form_type cannot be empty")
        return value.strip()

    # Rejects empty data — at least one field must be submitted
    @field_validator("data")
    @classmethod
    def data_cannot_be_empty(cls, value: dict) -> dict:
        if not value:
            raise ValueError("data cannot be an empty object")
        return value


# Internal schema used by submission_service — not exposed directly in routers
class SubmissionCreate(BaseModel):
    form_id: int
    form_type: str
    data: dict


# Submission object returned in the admin submissions list
class SubmissionResponse(BaseModel):
    id: int
    form_id: int
    form_type: str
    data: dict
    created_at: datetime

    class Config:
        from_attributes = True