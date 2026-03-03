# app/services/submission_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.form import FormSubmission, FormDefinition


def create(db: Session, form_id: int, form_type: str, data: dict) -> FormSubmission:
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    submission = FormSubmission(form_id=form_id, form_type=form_type, data=data)
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def get_by_form(db: Session, form_id: int, skip: int = 0, limit: int = 100) -> list[FormSubmission]:
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")

    return (
        db.query(FormSubmission)
        .filter(FormSubmission.form_id == form_id)
        .order_by(FormSubmission.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )