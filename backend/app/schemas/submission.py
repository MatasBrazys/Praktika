# app/schemas/submission.py

from pydantic import BaseModel
from datetime import datetime


class SubmissionCreate(BaseModel):
    form_id: int
    form_type: str
    data: dict


class SubmissionResponse(BaseModel):
    id: int
    form_id: int
    form_type: str
    data: dict
    created_at: datetime

    class Config:
        from_attributes = True