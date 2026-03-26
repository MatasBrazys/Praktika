# app/services/submission_service.py

import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.form import FormSubmission, FormDefinition
from app.models.user import User

logger = logging.getLogger(__name__)


def _enrich(submissions: list[FormSubmission], db: Session) -> list[FormSubmission]:
    """Attach submitted_by_username and updated_by_username to submission objects."""
    user_ids = set()
    for s in submissions:
        if s.submitted_by_user_id: user_ids.add(s.submitted_by_user_id)
        if s.updated_by_user_id:   user_ids.add(s.updated_by_user_id)

    if not user_ids:
        return submissions

    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map = {u.id: u.username for u in users}

    for s in submissions:
        s.submitted_by_username = user_map.get(s.submitted_by_user_id)
        s.updated_by_username   = user_map.get(s.updated_by_user_id)

    return submissions


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

    submission = FormSubmission(
        form_id=form_id,
        form_type=form_type,
        data=data,
        status='pending',
        submitted_by_user_id=submitted_by_user_id,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    logger.info("Submission created: id=%d form_id=%d user_id=%s", submission.id, form_id, submitted_by_user_id or "unknown")
    return submission


def get_by_id(db: Session, submission_id: int) -> FormSubmission:
    submission = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return _enrich([submission], db)[0]


def get_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> list[FormSubmission]:
    submissions = (
        db.query(FormSubmission)
        .filter(FormSubmission.submitted_by_user_id == user_id)
        .order_by(FormSubmission.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return _enrich(submissions, db)


def update(
    db: Session,
    submission_id: int,
    data: dict,
    user_id: int,
    is_admin: bool = False,
) -> FormSubmission:
    submission = get_by_id(db, submission_id)

    if not is_admin and submission.submitted_by_user_id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own submissions")

    submission.data = data
    submission.updated_by_user_id = user_id
    db.commit()
    db.refresh(submission)
    logger.info("Submission updated: id=%d by user_id=%d admin=%s", submission_id, user_id, is_admin)
    return _enrich([submission], db)[0]


def update_status(
    db: Session,
    submission_id: int,
    status: str,
    admin_user_id: int,
) -> FormSubmission:
    submission = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission.status = status
    db.commit()
    db.refresh(submission)
    logger.info("Submission status updated: id=%d status=%s by admin_id=%d", submission_id, status, admin_user_id)
    return _enrich([submission], db)[0]


def get_by_form(db: Session, form_id: int, skip: int = 0, limit: int = 100) -> list[FormSubmission]:
    form_exists = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form_exists:
        raise HTTPException(status_code=404, detail="Form not found")

    submissions = (
        db.query(FormSubmission)
        .filter(FormSubmission.form_id == form_id)
        .order_by(FormSubmission.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return _enrich(submissions, db)