# app/schemas/form_confirmation.py

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.form import FormConfirmation


class FormConfirmationBase(BaseModel):
    form_id: int
    username: str
    submission_id: Optional[int] = None


class FormConfirmationCreate(FormConfirmationBase):
    pass


class FormConfirmationUpdate(BaseModel):
    submission_id: Optional[int] = None


class FormConfirmationResponse(FormConfirmationBase):
    id: int
    confirmed_at: datetime

    class Config:
        from_attributes = True