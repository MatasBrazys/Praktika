# app/routers/submissions.py
# User-facing submission endpoints.
# Admins can access any submission; users only their own.

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.submission import SubmissionResponse, SubmissionUpdateRequest
from app.services import submission_service
from app.auth.dependencies import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/submissions", tags=["Submissions"])


@router.get("/mine", response_model=List[SubmissionResponse])
def my_submissions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.get_by_user(db, current_user.id, skip, limit)


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = submission_service.get_by_id(db, submission_id)
    # Admins can view any submission; users only their own
    if current_user.role != 'admin' and submission.submitted_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own submissions")
    return submission


@router.put("/{submission_id}", response_model=SubmissionResponse)
def update_submission(
    submission_id: int,
    body: SubmissionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("User id=%d updating submission id=%d", current_user.id, submission_id)
    is_admin = current_user.role == 'admin'
    return submission_service.update(db, submission_id, body.data, current_user.id, is_admin=is_admin)