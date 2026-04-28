# app/routers/dashboard.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.form import FormDefinition, FormSubmission

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _admin_stats(db: Session) -> dict:
    total_forms  = db.query(func.count(FormDefinition.id)).scalar() or 0
    active_forms = db.query(func.count(FormDefinition.id)).filter(FormDefinition.is_active == True).scalar() or 0
    rows = db.query(FormSubmission.status, func.count(FormSubmission.id)).group_by(FormSubmission.status).all()
    counts = {status: n for status, n in rows}
    recent = (
        db.query(FormSubmission)
        .order_by(FormSubmission.created_at.desc())
        .limit(10)
        .all()
    )
    return {
        "role": "admin",
        "total_forms": total_forms,
        "active_forms": active_forms,
        "total_submissions": sum(counts.values()),
        "pending":   counts.get("pending", 0),
        "confirmed": counts.get("confirmed", 0),
        "declined":  counts.get("declined", 0),
        "recent_submissions": [
            {
                "id": s.id,
                "form_id": s.form_id,
                "form_type": s.form_type,
                "submitted_by_username": s.submitted_by_username or "unknown",
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else "",
            }
            for s in recent
        ],
    }


def _confirmer_stats(db: Session) -> dict:
    rows = (
        db.query(FormDefinition.id, FormDefinition.title, func.count(FormSubmission.id))
        .join(FormSubmission, FormSubmission.form_id == FormDefinition.id)
        .filter(FormSubmission.status == "pending")
        .group_by(FormDefinition.id, FormDefinition.title)
        .order_by(func.count(FormSubmission.id).desc())
        .all()
    )
    forms = [{"id": r[0], "title": r[1], "pending_count": r[2]} for r in rows]
    return {
        "role": "form_confirmer",
        "pending_total": sum(f["pending_count"] for f in forms),
        "forms_with_pending": forms,
    }


def _user_stats(db: Session, username: str) -> dict:
    subs = db.query(FormSubmission).filter(FormSubmission.submitted_by_username == username).all()
    active_forms = db.query(func.count(FormDefinition.id)).filter(FormDefinition.is_active == True).scalar() or 0
    counts: dict[str, int] = {"pending": 0, "confirmed": 0, "declined": 0}
    for s in subs:
        if s.status in counts:
            counts[s.status] += 1
    recent = sorted(subs, key=lambda s: s.created_at, reverse=True)[:5]
    return {
        "role": "user",
        "total": len(subs),
        **counts,
        "active_forms_count": active_forms,
        "recent_submissions": [
            {
                "id": s.id,
                "form_id": s.form_id,
                "form_type": s.form_type,
                "status": s.status,
                "created_at": s.created_at.isoformat() if s.created_at else "",
            }
            for s in recent
        ],
    }


@router.get("/")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "admin":
        return _admin_stats(db)
    elif current_user.role == "form_confirmer":
        return _confirmer_stats(db)
    else:
        return _user_stats(db, current_user.username)
