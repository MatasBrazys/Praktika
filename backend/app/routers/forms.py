# app/routers/forms.py

import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.form import FormDefinitionCreate, FormDefinitionUpdate, FormDefinitionResponse
from app.schemas.submission import SubmissionRequest, SubmissionResponse, StatusUpdateRequest, SubmissionUpdateRequest, SubmissionEventResponse
from app.services import form_service, submission_service
from app.auth.dependencies import get_current_user, require_admin, require_form_confirmer
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
    form = form_service.get_by_id(db, form_id)

    submission = submission_service.create(
        db,
        form_id=form_id,
        form_type=body.form_type,
        data=body.data,
        submitted_by_username=current_user.username,
        submitted_by_email=current_user.email,
    )

    if form.requires_confirmation:
        submission_service.notify_submission_created(
            db, form_id, form.title, submission.id, current_user.email,
            submitted_by_username=current_user.username,
            submission_data=submission.data,
        )
    else:
        submission_service.update_status(
            db, submission.id, 'confirmed',
            updated_by_username='system',
            updated_by_email=None,
        )
        submission_service.notify_submission_confirmed(
            db, submission.id, form.title, current_user.email,
            form_id=form_id,
            submitted_by_username=current_user.username,
            submission_data=submission.data,
        )

    logger.info("User %s submitted form id=%d, submission id=%d (confirmation=%s)",
                current_user.username, form_id, submission.id, form.requires_confirmation)
    return {
        "message": "Form submitted successfully",
        "submission_id": submission.id,
        "form_title": form.title
    }


@router.get("/my-submissions", response_model=List[SubmissionResponse])
def get_my_submissions(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return submission_service.get_by_user(db, current_user.username, skip, limit)


@router.get("/{form_id}/submissions", response_model=List[SubmissionResponse])
def get_submissions(
    form_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_form_confirmer),
):
    return submission_service.get_by_form(db, form_id, skip, limit)


@router.patch("/{form_id}/submissions/{submission_id}/status", response_model=SubmissionResponse)
def update_submission_status(
    form_id: int,
    submission_id: int,
    body: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_form_confirmer),
):
    if current_user.role == 'form_confirmer' and body.status not in ('confirmed', 'declined'):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Form confirmers can only approve or decline")
    
    result = submission_service.update_status(
        db, submission_id, body.status, 
        updated_by_username=current_user.username,
        updated_by_email=current_user.email,
        comment=body.comment
    )
    
    form = form_service.get_by_id(db, form_id)
    
    if body.status == 'declined':
        submission_service.notify_submission_declined(
            db, submission_id, form.title, result.submitted_by_email, body.comment or "",
            form_id=form_id,
            submitted_by_username=result.submitted_by_username,
            submission_data=result.data,
        )
    elif body.status == 'confirmed':
        submission_service.notify_submission_confirmed(
            db, submission_id, form.title, result.submitted_by_email,
            form_id=form_id,
            submitted_by_username=result.submitted_by_username,
            submission_data=result.data,
        )
    
    logger.info("User %s updating submission id=%d status to %s", current_user.username, submission_id, body.status)
    return result


@router.put("/my-submissions/{submission_id}", response_model=SubmissionResponse)
def user_update_submission(
    submission_id: int,
    body: SubmissionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = submission_service.get_by_id(db, submission_id)

    if submission.submitted_by_username != current_user.username:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="You can only edit your own submissions")

    if submission.status not in ('declined', 'pending'):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="You can only edit declined or pending submissions")

    logger.info("User %s editing submission id=%d (was %s)", current_user.username, submission_id, submission.status)

    if submission.status == 'declined':
        return submission_service.resubmit(
            db, submission_id, body.data,
            actor_username=current_user.username,
            actor_email=current_user.email,
        )

    return submission_service.update(
        db, submission_id, body.data,
        updated_by_username=current_user.username,
        updated_by_email=current_user.email,
    )


@router.get("/my-submissions/{submission_id}/events", response_model=List[SubmissionEventResponse])
def get_my_submission_events(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException
    sub = submission_service.get_by_id(db, submission_id)
    if sub.submitted_by_username != current_user.username:
        raise HTTPException(status_code=403, detail="Access denied")
    return submission_service.get_events(db, submission_id)


@router.delete("/{form_id}/submissions/{submission_id}")
def delete_submission(
    form_id: int,
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission_service.delete_declined(
        db, submission_id,
        requesting_username=current_user.username,
        is_admin=(current_user.role == 'admin'),
    )
    logger.info("Submission id=%d deleted by %s", submission_id, current_user.username)
    return {"message": "Submission deleted", "id": submission_id}


@router.get("/{form_id}/submissions/{submission_id}/events", response_model=List[SubmissionEventResponse])
def get_submission_events(
    form_id: int,
    submission_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_form_confirmer),
):
    return submission_service.get_events(db, submission_id)


@router.put("/{form_id}/submissions/{submission_id}", response_model=SubmissionResponse)
def admin_update_submission(
    form_id: int,
    submission_id: int,
    body: SubmissionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    logger.info("Admin %s editing submission id=%d", current_user.username, submission_id)
    return submission_service.update(
        db, submission_id, body.data,
        updated_by_username=current_user.username,
        updated_by_email=current_user.email,
        record_edit=True,
    )
