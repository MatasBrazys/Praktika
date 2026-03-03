# app/routers/forms.py
#
# WHY this auth split:
#   GET  /api/forms/        → public (user needs to see available forms)
#   GET  /api/forms/{id}    → public (user needs to load form to fill it)
#   POST /api/forms/        → admin only (create form)
#   PUT  /api/forms/{id}    → admin only (edit form)
#   DELETE /api/forms/{id}  → admin only
#   PATCH toggle            → admin only
#   POST submit             → any authenticated user
#   GET  submissions        → admin only
#
# POST-MVP: move submit to require a "user" role once manager accounts are firmed up.

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.form import FormDefinitionCreate, FormDefinitionUpdate, FormDefinitionResponse
from app.schemas.submission import SubmissionCreate, SubmissionResponse
from app.services import form_service, submission_service
from app.auth.dependencies import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/api/forms", tags=["Forms"])


# ── Public reads ─────────────────────────────────────────────────────────────

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


# ── Admin writes ──────────────────────────────────────────────────────────────

@router.post("/", response_model=FormDefinitionResponse)
def create_form(
    data: FormDefinitionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),          # 403 if not admin
):
    return form_service.create(db, data)


@router.put("/{form_id}", response_model=FormDefinitionResponse)
def update_form(
    form_id: int,
    data: FormDefinitionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return form_service.update(db, form_id, data)


@router.delete("/{form_id}")
def delete_form(
    form_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return form_service.delete(db, form_id)


@router.patch("/{form_id}/toggle")
def toggle_active(
    form_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return form_service.toggle_active(db, form_id)


# ── Submissions ───────────────────────────────────────────────────────────────

@router.post("/{form_id}/submit")
def submit_form(
    form_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),   # must be logged in, any role
):
    submission = submission_service.create(
        db,
        form_id=form_id,
        form_type=body.get("form_type", "unknown"),
        data=body.get("data", {}),
    )
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