from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.form import FormDefinition,FormSubmission
from app.schemas.form import (
    FormDefinitionCreate,
    FormDefinitionUpdate,
    FormDefinitionResponse,
    FormSubmissionResponse   
)

router = APIRouter(prefix="/api/forms", tags=["Forms Management"])


@router.get("/", response_model=List[FormDefinitionResponse])
def list_forms(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db)
):
    """List all forms (with optional filtering)"""
    query = db.query(FormDefinition)
    
    if active_only:
        query = query.filter(FormDefinition.is_active == True)
    
    forms = query.offset(skip).limit(limit).all()
    return forms


@router.get("/{form_id}", response_model=FormDefinitionResponse)
def get_form(form_id: int, db: Session = Depends(get_db)):
    """Get single form by ID"""
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    return form


@router.post("/", response_model=FormDefinitionResponse)
def create_form(
    form_data: FormDefinitionCreate,
    db: Session = Depends(get_db)
):
    """Create new form"""
    new_form = FormDefinition(
        title=form_data.title,
        description=form_data.description,
        surveyjs_json=form_data.surveyjs_json,
        is_active=form_data.is_active
    )
    
    db.add(new_form)
    db.commit()
    db.refresh(new_form)
    
    return new_form


@router.put("/{form_id}", response_model=FormDefinitionResponse)
def update_form(
    form_id: int,
    form_data: FormDefinitionUpdate,
    db: Session = Depends(get_db)
):
    """Update existing form"""
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Update only provided fields
    update_data = form_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(form, key, value)
    
    db.commit()
    db.refresh(form)
    
    return form


@router.delete("/{form_id}")
def delete_form(form_id: int, db: Session = Depends(get_db)):
    """Delete form"""
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    db.delete(form)
    db.commit()
    
    return {"message": "Form deleted successfully", "id": form_id}


@router.patch("/{form_id}/toggle")
def toggle_form_active(form_id: int, db: Session = Depends(get_db)):
    """Toggle form active status"""
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    form.is_active = not form.is_active
    db.commit()
    db.refresh(form)
    
    return {"message": "Form status toggled", "is_active": form.is_active}

@router.get("/{form_id}/submissions", response_model=List[FormSubmissionResponse])
def get_form_submissions(
    form_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Get all submissions for a specific form"""
    # Verify form exists
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Get submissions by form_id
    submissions = db.query(FormSubmission)\
        .filter(FormSubmission.form_id == form_id)\
        .order_by(FormSubmission.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    return submissions

