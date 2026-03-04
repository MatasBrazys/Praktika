# app/services/submission_service.py
# Business logic for form submissions.
# Submissions are immutable after creation — never updated, only read or deleted via CASCADE.

import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.form import FormSubmission, FormDefinition

logger = logging.getLogger(__name__)


# Saves a completed form response — raises 404 if the target form does not exist
def create(
    db: Session,
    form_id: int,
    form_type: str,
    data: dict,
    submitted_by_user_id: int | None = None,
) -> FormSubmission:
    form_exists = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form_exists:
        raise HTTPException(status_code=404, detail="Form not found")

    submission = FormSubmission(form_id=form_id, form_type=form_type, data=data)
    db.add(submission)
    db.commit()
    db.refresh(submission)
    logger.info(
        "Submission created: id=%d form_id=%d user_id=%s",
        submission.id, form_id, submitted_by_user_id or "unknown",
    )
    return submission


# Returns submissions for a form ordered newest first
def get_by_form(db: Session, form_id: int, skip: int = 0, limit: int = 100) -> list[FormSubmission]:
    form_exists = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form_exists:
        raise HTTPException(status_code=404, detail="Form not found")

    return (
        db.query(FormSubmission)
        .filter(FormSubmission.form_id == form_id)
        .order_by(FormSubmission.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )