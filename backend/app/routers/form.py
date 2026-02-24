from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.form import FormSubmission, FormDefinition

router = APIRouter()

@router.post("/submit")
async def submit_form(form_data: dict, db: Session = Depends(get_db)):
    """Submit a form response"""
    form_id = form_data.get("form_id")
    
    if not form_id:
        raise HTTPException(status_code=400, detail="form_id is required")
    
    # Verify form exists
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Create submission
    survey_entry = FormSubmission(
        form_id=form_id,  
        form_type=form_data.get("form_type", "unknown"),
        data=form_data.get("data", {})
    )
    
    db.add(survey_entry)
    db.commit()
    db.refresh(survey_entry)

    return {"message": "Form submitted successfully", "submission_id": survey_entry.id}

