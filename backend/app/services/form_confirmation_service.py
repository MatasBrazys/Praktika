# app/services/form_confirmation_service.py

import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.form import FormConfirmation, FormDefinition, FormSubmission
from app.models.user import User
from app.schemas.form_confirmation import FormConfirmationCreate

logger = logging.getLogger(__name__)


def create_confirmation(db: Session, form_id: int, user_id: int, submission_id: int | None = None) -> FormConfirmation:
    """Create a form confirmation record"""
    # Verify form exists
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Verify user exists and has proper role
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in ["admin", "form_confirmer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to confirm forms")
    
    # Verify submission exists if provided
    if submission_id:
        submission = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        if submission.form_id != form_id:
            raise HTTPException(status_code=400, detail="Submission does not belong to this form")
    
    # Check if confirmation already exists
    existing = db.query(FormConfirmation).filter(
        FormConfirmation.form_id == form_id,
        FormConfirmation.user_id == user_id
    ).first()
    if existing:
        # Update existing confirmation
        existing.submission_id = submission_id
        db.commit()
        db.refresh(existing)
        logger.info("Form confirmation updated: form_id=%d user_id=%d submission_id=%s", 
                   form_id, user_id, submission_id)
        return existing
    
    # Create new confirmation
    confirmation = FormConfirmation(
        form_id=form_id,
        user_id=user_id,
        submission_id=submission_id
    )
    db.add(confirmation)
    db.commit()
    db.refresh(confirmation)
    logger.info("Form confirmation created: form_id=%d user_id=%d submission_id=%s", 
               form_id, user_id, submission_id)
    return confirmation


def get_confirmation(db: Session, form_id: int, user_id: int) -> FormConfirmation | None:
    """Get a specific form confirmation"""
    return db.query(FormConfirmation).filter(
        FormConfirmation.form_id == form_id,
        FormConfirmation.user_id == user_id
    ).first()


def get_form_confirmations(db: Session, form_id: int, skip: int = 0, limit: int = 100) -> list[FormConfirmation]:
    """Get all confirmations for a specific form"""
    return db.query(FormConfirmation).filter(
        FormConfirmation.form_id == form_id
    ).offset(skip).limit(limit).all()


def get_user_confirmations(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[FormConfirmation]:
    """Get all forms confirmed by a specific user"""
    return db.query(FormConfirmation).filter(
        FormConfirmation.user_id == user_id
    ).offset(skip).limit(limit).all()


def delete_confirmation(db: Session, form_id: int, user_id: int) -> bool:
    """Delete a form confirmation"""
    confirmation = db.query(FormConfirmation).filter(
        FormConfirmation.form_id == form_id,
        FormConfirmation.user_id == user_id
    ).first()
    if confirmation:
        db.delete(confirmation)
        db.commit()
        logger.info("Form confirmation deleted: form_id=%d user_id=%d", form_id, user_id)
        return True
    return False


def get_confirmation_with_details(db: Session, form_id: int, user_id: int) -> dict:
    """Get confirmation with form and submission details"""
    confirmation = get_confirmation(db, form_id, user_id)
    if not confirmation:
        return None
    
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    submission = None
    if confirmation.submission_id:
        submission = db.query(FormSubmission).filter(FormSubmission.id == confirmation.submission_id).first()
    
    return {
        "confirmation": confirmation,
        "form": form,
        "submission": submission
    }