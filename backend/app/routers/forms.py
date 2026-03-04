# app/routers/forms.py
# Form CRUD and submission endpoints.
#
# Access rules:
#   GET    /api/forms/                 — any authenticated user
#   GET    /api/forms/{id}             — any authenticated user
#   POST   /api/forms/                 — admin only
#   PUT    /api/forms/{id}             — admin only
#   DELETE /api/forms/{id}             — admin only
#   PATCH  /api/forms/{id}/toggle      — admin only
#   POST   /api/forms/{id}/submit      — any authenticated user
#   GET    /api/forms/{id}/submissions — admin only

import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.form import FormDefinitionCreate, FormDefinitionUpdate, FormDefinitionResponse
from app.schemas.submission import SubmissionRequest, SubmissionResponse
from app.services import form_service, submission_service
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forms", tags=["Forms"])


# Returns all forms, optionally filtered to active-only
@router.get("/", response_model=List[FormDefinitionResponse])
def list_forms(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    db: Session = Depends(get_db),
):
    return form_service.get_all(db, skip, limit, active_only)


# Returns a single form including full surveyjs_json
@router.get("/{form_id}", response_model=FormDefinitionResponse)
def get_form(form_id: int, db: Session = Depends(get_db)):
    return form_service.get_by_id(db, form_id)


# Creates a new form — admin only
@router.post("/", response_model=FormDefinitionResponse)
def create_form(
    data: FormDefinitionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.info("Admin id=%d creating form: %r", current_user.id, data.title)
    return form_service.create(db, data)


# Updates an existing form — supports partial updates
@router.put("/{form_id}", response_model=FormDefinitionResponse)
def update_form(
    form_id: int,
    data: FormDefinitionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.info("Admin id=%d updating form id=%d", current_user.id, form_id)
    return form_service.update(db, form_id, data)


# Permanently deletes a form and all its submissions (CASCADE)
@router.delete("/{form_id}")
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.warning("Admin id=%d deleting form id=%d", current_user.id, form_id)
    return form_service.delete(db, form_id)


# Toggles form active status — inactive forms are hidden from users
@router.patch("/{form_id}/toggle")
def toggle_active(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.info("Admin id=%d toggling form id=%d", current_user.id, form_id)
    return form_service.toggle_active(db, form_id)


# Saves a completed form submission — any logged-in user
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


# Returns all submissions for a form — admin only, newest first
@router.get("/{form_id}/submissions", response_model=List[SubmissionResponse])
def get_submissions(
    form_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return submission_service.get_by_form(db, form_id, skip, limit)