# app/services/submission_service.py

import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.form import FormSubmission, FormDefinition
from app.models.user import User
from app.services.email_service import (
    notify_confirmers_new_submission,
    notify_submitter_declined,
    notify_submitter_confirmed,
)

logger = logging.getLogger(__name__)


def create(
    db: Session,
    form_id: int,
    form_type: str,
    data: dict,
    submitted_by_username: str | None = None,
    submitted_by_email: str | None = None,
) -> FormSubmission:
    form_exists = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form_exists:
        raise HTTPException(status_code=404, detail="Form not found")

    submission = FormSubmission(
        form_id=form_id,
        form_type=form_type,
        data=data,
        status='pending',
        submitted_by_username=submitted_by_username,
        submitted_by_email=submitted_by_email,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    record_event(db, submission.id, 'submitted', submitted_by_username or 'unknown')
    db.commit()
    logger.info("Submission created: id=%d form_id=%d by %s", submission.id, form_id, submitted_by_username or "unknown")
    return submission


def get_by_id(db: Session, submission_id: int) -> FormSubmission:
    submission = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


def get_by_user(db: Session, username: str, skip: int = 0, limit: int = 100) -> list[FormSubmission]:
    submissions = (
        db.query(FormSubmission)
        .filter(FormSubmission.submitted_by_username == username)
        .order_by(FormSubmission.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return submissions


def update(
    db: Session,
    submission_id: int,
    data: dict,
    updated_by_username: str | None = None,
    updated_by_email: str | None = None,
    record_edit: bool = False,
) -> FormSubmission:
    submission = get_by_id(db, submission_id)

    submission.data = data
    submission.updated_by_username = updated_by_username
    submission.updated_by_email = updated_by_email
    if record_edit:
        record_event(db, submission_id, 'edited', updated_by_username or 'unknown')
    db.commit()
    db.refresh(submission)
    logger.info("Submission updated: id=%d by %s", submission_id, updated_by_username)
    return submission


def update_status(
    db: Session,
    submission_id: int,
    status: str,
    updated_by_username: str | None = None,
    updated_by_email: str | None = None,
    comment: str | None = None,
) -> FormSubmission:
    submission = db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    submission.status = status
    submission.updated_by_username = updated_by_username
    submission.updated_by_email = updated_by_email

    if status == 'declined' and comment:
        submission.decline_comment = comment
        record_event(db, submission_id, 'declined', updated_by_username or 'unknown', comment=comment)
    elif status == 'confirmed':
        submission.decline_comment = None
        record_event(db, submission_id, 'confirmed', updated_by_username or 'unknown')
    elif status == 'pending':
        submission.decline_comment = None
        # 'pending' reset is recorded as 'resubmitted' by the resubmit() function — no event here

    db.commit()
    db.refresh(submission)
    logger.info("Submission status updated: id=%d status=%s by %s", submission_id, status, updated_by_username)
    return submission


def delete_declined(db: Session, submission_id: int, requesting_username: str, is_admin: bool) -> None:
    submission = get_by_id(db, submission_id)
    if submission.status != 'declined':
        raise HTTPException(status_code=400, detail="Only declined submissions can be deleted")
    if not is_admin and submission.submitted_by_username != requesting_username:
        raise HTTPException(status_code=403, detail="You can only delete your own submissions")
    db.delete(submission)
    db.commit()
    logger.info("Submission deleted: id=%d by %s (admin=%s)", submission_id, requesting_username, is_admin)


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
    return submissions


def resubmit(
    db: Session,
    submission_id: int,
    data: dict,
    actor_username: str,
    actor_email: str | None = None,
) -> FormSubmission:
    sub = get_by_id(db, submission_id)
    sub.data = data
    sub.status = 'pending'
    sub.updated_by_username = actor_username
    sub.updated_by_email = actor_email
    sub.decline_comment = None
    record_event(db, submission_id, 'resubmitted', actor_username)
    db.commit()
    db.refresh(sub)
    logger.info("Submission resubmitted: id=%d by %s", submission_id, actor_username)
    return sub


def record_event(
    db: Session,
    submission_id: int,
    event_type: str,
    actor_username: str,
    comment: str | None = None,
) -> None:
    from app.models.submission_event import SubmissionEvent
    db.add(SubmissionEvent(
        submission_id=submission_id,
        event_type=event_type,
        actor_username=actor_username,
        comment=comment,
    ))


def get_events(db: Session, submission_id: int):
    from app.models.submission_event import SubmissionEvent
    return (
        db.query(SubmissionEvent)
        .filter(SubmissionEvent.submission_id == submission_id)
        .order_by(SubmissionEvent.occurred_at)
        .all()
    )


def get_confirmers_emails(db: Session) -> list[str]:
    """Gauna visų confirmerių email'us iš DB."""
    confirmers = db.query(User).filter(User.role == 'form_confirmer').all()
    return [u.email for u in confirmers if u.email]


def notify_submission_created(
    db: Session,
    form_id: int,
    form_title: str,
    submission_id: int,
    submitted_by_email: str | None,
    submitted_by_username: str | None = None,
    submission_data: dict | None = None,
):
    confirmers = get_confirmers_emails(db)
    if not confirmers:
        logger.warning("No confirmers found for new submission %d", submission_id)
        return
    submitted_by = submitted_by_username or submitted_by_email or "Unknown"
    logger.info("Sending notification to %d confirmers about submission %d", len(confirmers), submission_id)
    notify_confirmers_new_submission(
        form_title=form_title,
        submission_id=submission_id,
        submitted_by=submitted_by,
        confirmers=confirmers,
        form_id=form_id,
        submission_data=submission_data,
    )


def notify_submission_declined(
    db: Session,
    submission_id: int,
    form_title: str,
    submitter_email: str | None,
    comment: str,
    form_id: int,
    submitted_by_username: str | None = None,
    submission_data: dict | None = None,
):
    if not submitter_email:
        logger.warning("No submitter email for declined submission %d", submission_id)
        return
    logger.info("Sending decline notification to %s for submission %d", submitter_email, submission_id)
    notify_submitter_declined(
        form_title=form_title,
        submission_id=submission_id,
        decline_reason=comment,
        submitter_email=submitter_email,
        form_id=form_id,
        submitted_by=submitted_by_username or submitter_email,
        submission_data=submission_data,
    )


def notify_submission_confirmed(
    db: Session,
    submission_id: int,
    form_title: str,
    submitter_email: str | None,
    form_id: int,
    submitted_by_username: str | None = None,
    submission_data: dict | None = None,
):
    if not submitter_email:
        logger.warning("No submitter email for confirmed submission %d", submission_id)
        return
    logger.info("Sending confirmation notification to %s for submission %d", submitter_email, submission_id)
    notify_submitter_confirmed(
        form_title=form_title,
        submission_id=submission_id,
        submitter_email=submitter_email,
        form_id=form_id,
        submitted_by=submitted_by_username or submitter_email,
        submission_data=submission_data,
    )
