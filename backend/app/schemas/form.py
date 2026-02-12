from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# FormDefinition schemas
class FormDefinitionBase(BaseModel):
    title: str
    description: Optional[str] = None
    surveyjs_json: dict
    is_active: bool = True

class FormDefinitionCreate(FormDefinitionBase):
    pass

class FormDefinitionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    surveyjs_json: Optional[dict] = None
    is_active: Optional[bool] = None

class FormDefinitionResponse(FormDefinitionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class FormSubmissionResponse(BaseModel):
    id: int
    form_type: str
    data: dict
    created_at: datetime
    
    class Config:
        from_attributes = True