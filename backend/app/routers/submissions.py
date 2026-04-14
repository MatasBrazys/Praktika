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
    return submission_service.get_by_user(db, current_user.username, skip, limit)


@router.get("/{submission_id}", response_model=SubmissionResponse)
def get_submission(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = submission_service.get_by_id(db, submission_id)
    if current_user.role != 'admin' and submission.submitted_by_username != current_user.username:
        raise HTTPException(status_code=403, detail="You can only view your own submissions")
    return submission


@router.put("/{submission_id}", response_model=SubmissionResponse)
def update_submission(
    submission_id: int,
    body: SubmissionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = submission_service.get_by_id(db, submission_id)
    if submission.submitted_by_username != current_user.username:
        raise HTTPException(status_code=403, detail="You can only edit your own submissions")
    logger.info("User %s updating submission id=%d", current_user.username, submission_id)
    return submission_service.update(
        db, submission_id, body.data,
        updated_by_username=current_user.username,
        updated_by_email=current_user.email
    )