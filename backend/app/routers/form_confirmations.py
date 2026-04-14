# app/routers/form_confirmations.py

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.form import FormConfirmation
from app.schemas.form_confirmation import FormConfirmationCreate, FormConfirmationResponse, FormConfirmationUpdate
from app.services.form_confirmation_service import (
    create_confirmation,
    get_confirmation,
    get_form_confirmations,
    get_user_confirmations,
    delete_confirmation,
    get_confirmation_with_details
)
from app.auth.dependencies import get_current_user, require_admin, require_form_confirmer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/form-confirmations", tags=["Form Confirmations"])


@router.post("/", response_model=FormConfirmationResponse)
def create_form_confirmation(
    data: FormConfirmationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_form_confirmer),
):
    """Create or update a form confirmation"""
    logger.info("User %s confirming form id=%d", current_user.username, data.form_id)
    return create_confirmation(db, data.form_id, current_user.username, data.submission_id)


@router.get("/my-confirmations", response_model=List[FormConfirmationResponse])
def get_my_confirmations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all forms confirmed by the current user"""
    return get_user_confirmations(db, current_user.username, skip, limit)


@router.get("/form/{form_id}", response_model=List[FormConfirmationResponse])
def get_confirmations_for_form(
    form_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_form_confirmer),
):
    """Get all confirmations for a specific form"""
    return get_form_confirmations(db, form_id, skip, limit)


@router.get("/check/{form_id}", response_model=FormConfirmationResponse)
def check_user_confirmation(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check if current user has confirmed a specific form"""
    confirmation = get_confirmation(db, form_id, current_user.username)
    if not confirmation:
        raise HTTPException(status_code=404, detail="Confirmation not found")
    return confirmation


@router.get("/details/{form_id}")
def get_confirmation_details(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_form_confirmer),
):
    """Get confirmation details with form and submission info"""
    details = get_confirmation_with_details(db, form_id, current_user.username)
    if not details:
        raise HTTPException(status_code=404, detail="Confirmation not found")
    return details


@router.delete("/{form_id}")
def delete_form_confirmation(
    form_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_form_confirmer),
):
    """Delete a form confirmation"""
    success = delete_confirmation(db, form_id, current_user.username)
    if not success:
        raise HTTPException(status_code=404, detail="Confirmation not found")
    return {"message": "Confirmation deleted successfully"}


@router.get("/admin/all", response_model=List[FormConfirmationResponse])
def get_all_confirmations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Get all form confirmations (admin only)"""
    return db.query(FormConfirmation).offset(skip).limit(limit).all()
