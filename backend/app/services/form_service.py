# app/services/form_service.py
# Business logic for form management.
# Routers never call db.query() directly — all DB access goes through here.

import logging
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.form import FormDefinition
from app.schemas.form import FormDefinitionCreate, FormDefinitionUpdate

logger = logging.getLogger(__name__)


# Returns all forms, optionally filtered to active-only
def get_all(db: Session, skip: int = 0, limit: int = 100, active_only: bool = False) -> list[FormDefinition]:
    query = db.query(FormDefinition)
    if active_only:
        query = query.filter(FormDefinition.is_active == True)
    return query.offset(skip).limit(limit).all()


# Raises 404 if the form does not exist
def get_by_id(db: Session, form_id: int) -> FormDefinition:
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


# Creates a new form and returns it with the assigned ID
def create(db: Session, data: FormDefinitionCreate) -> FormDefinition:
    form = FormDefinition(**data.model_dump())
    db.add(form)
    db.commit()
    db.refresh(form)
    logger.info("Form created: id=%d title=%r", form.id, form.title)
    return form


# Updates only the fields that were included in the request (partial update)
def update(db: Session, form_id: int, data: FormDefinitionUpdate) -> FormDefinition:
    form = get_by_id(db, form_id)
    updated_fields = data.model_dump(exclude_unset=True)
    for field_name, new_value in updated_fields.items():
        setattr(form, field_name, new_value)
    db.commit()
    db.refresh(form)
    logger.info("Form updated: id=%d fields=%s", form.id, list(updated_fields.keys()))
    return form


# Permanently deletes a form and all its submissions via CASCADE
def delete(db: Session, form_id: int) -> dict:
    form = get_by_id(db, form_id)
    db.delete(form)
    db.commit()
    logger.warning("Form deleted: id=%d title=%r", form_id, form.title)
    return {"message": "Form deleted successfully", "id": form_id}


# Flips is_active between True and False
def toggle_active(db: Session, form_id: int) -> FormDefinition:
    form = get_by_id(db, form_id)
    form.is_active = not form.is_active
    db.commit()
    db.refresh(form)
    logger.info("Form %s: id=%d", "activated" if form.is_active else "deactivated", form.id)
    return form