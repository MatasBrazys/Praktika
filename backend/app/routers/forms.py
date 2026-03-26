# app/routers/forms.py

import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.form import FormDefinitionCreate, FormDefinitionUpdate, FormDefinitionResponse
from app.schemas.submission import SubmissionRequest, SubmissionResponse, StatusUpdateRequest, SubmissionUpdateRequest
from app.services import form_service, submission_service
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forms", tags=["Forms"])


@router.get("/", response_model=List[FormDefinitionResponse])
def list_forms(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    return form_service.get_all(db, skip, limit, active_only)


@router.get("/{form_id}", response_model=FormDefinitionResponse)
def get_form(form_id: int, db: Session = Depends(get_db)):
    return form_service.get_by_id(db, form_id)


@router.post("/", response_model=FormDefinitionResponse)
def create_form(
    data: FormDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.info("Admin id=%d creating form: %r", current_user.id, data.title)
    return form_service.create(db, data)


@router.put("/{form_id}", response_model=FormDefinitionResponse)
def update_form(
    form_id: int,
    data: FormDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.info("Admin id=%d updating form id=%d", current_user.id, form_id)
    return form_service.update(db, form_id, data)


@router.delete("/{form_id}")
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.warning("Admin id=%d deleting form id=%d", current_user.id, form_id)
    return form_service.delete(db, form_id)


@router.patch("/{form_id}/toggle")
def toggle_active(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.info("Admin id=%d toggling form id=%d", current_user.id, form_id)
    return form_service.toggle_active(db, form_id)


@router.post("/{form_id}/submit")
def submit_form(
    form_id: int,
    body: SubmissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = submission_service.create(
        db,
        form_id=form_id,
        form_type=body.form_type,
        data=body.data,
        submitted_by_user_id=current_user.id,
    )
    logger.info("User id=%d submitted form id=%d, submission id=%d", current_user.id, form_id, submission.id)
    return {"message": "Form submitted successfully", "submission_id": submission.id}


@router.get("/{form_id}/submissions", response_model=List[SubmissionResponse])
def get_submissions(
    form_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return submission_service.get_by_form(db, form_id, skip, limit)


# ── Admin: update submission status ──────────────────────────────────────────

@router.patch("/{form_id}/submissions/{submission_id}/status", response_model=SubmissionResponse)
def update_submission_status(
    form_id: int,
    submission_id: int,
    body: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.info("Admin id=%d updating submission id=%d status to %s", current_user.id, submission_id, body.status)
    return submission_service.update_status(db, submission_id, body.status, current_user.id)


# ── Admin: edit any submission data ──────────────────────────────────────────

@router.put("/{form_id}/submissions/{submission_id}", response_model=SubmissionResponse)
def admin_update_submission(
    form_id: int,
    submission_id: int,
    body: SubmissionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.info("Admin id=%d editing submission id=%d", current_user.id, submission_id)
    return submission_service.update(db, submission_id, body.data, current_user.id, is_admin=True)