# app/services/form_confirmation_service.py

import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.form import FormConfirmation, FormDefinition, FormSubmission
from app.models.user import User

logger = logging.getLogger(__name__)


def create_confirmation(db: Session, form_id: int, username: str, submission_id: int | None = None) -> FormConfirmation:
    """Create a form confirmation record"""
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role not in ["admin", "form_confirmer"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to confirm forms")
    
    if submission_id:
        submission = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
        if not submission:
            raise HTTPException(status_code=404, detail="Submission not found")
        if submission.form_id != form_id:
            raise HTTPException(status_code=400, detail="Submission does not belong to this form")
    
    existing = db.query(FormConfirmation).filter(
        FormConfirmation.form_id == form_id,
        FormConfirmation.username == username
    ).first()
    if existing:
        existing.submission_id = submission_id
        db.commit()
        db.refresh(existing)
        logger.info("Form confirmation updated: form_id=%d username=%s submission_id=%s", 
                   form_id, username, submission_id)
        return existing
    
    confirmation = FormConfirmation(
        form_id=form_id,
        username=username,
        submission_id=submission_id
    )
    db.add(confirmation)
    db.commit()
    db.refresh(confirmation)
    logger.info("Form confirmation created: form_id=%d username=%s submission_id=%s", 
               form_id, username, submission_id)
    return confirmation


def get_confirmation(db: Session, form_id: int, username: str) -> FormConfirmation | None:
    """Get a specific form confirmation"""
    return db.query(FormConfirmation).filter(
        FormConfirmation.form_id == form_id,
        FormConfirmation.username == username
    ).first()


def get_form_confirmations(db: Session, form_id: int, skip: int = 0, limit: int = 100) -> list[FormConfirmation]:
    """Get all confirmations for a specific form"""
    return db.query(FormConfirmation).filter(
        FormConfirmation.form_id == form_id
    ).offset(skip).limit(limit).all()


def get_user_confirmations(db: Session, username: str, skip: int = 0, limit: int = 100) -> list[FormConfirmation]:
    """Get all forms confirmed by a specific user"""
    return db.query(FormConfirmation).filter(
        FormConfirmation.username == username
    ).offset(skip).limit(limit).all()


def delete_confirmation(db: Session, form_id: int, username: str) -> bool:
    """Delete a form confirmation"""
    confirmation = db.query(FormConfirmation).filter(
        FormConfirmation.form_id == form_id,
        FormConfirmation.username == username
    ).first()
    if confirmation:
        db.delete(confirmation)
        db.commit()
        logger.info("Form confirmation deleted: form_id=%d username=%s", form_id, username)
        return True
    return False


def get_confirmation_with_details(db: Session, form_id: int, username: str) -> dict:
    """Get confirmation with form and submission details"""
    confirmation = get_confirmation(db, form_id, username)
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
