# app/services/form_service.py

from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.form import FormDefinition
from app.schemas.form import FormDefinitionCreate, FormDefinitionUpdate


def get_all(db: Session, skip: int = 0, limit: int = 100, active_only: bool = False) -> list[FormDefinition]:
    query = db.query(FormDefinition)
    if active_only:
        query = query.filter(FormDefinition.is_active == True)
    return query.offset(skip).limit(limit).all()


def get_by_id(db: Session, form_id: int) -> FormDefinition:
    form = db.query(FormDefinition).filter(FormDefinition.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


def create(db: Session, data: FormDefinitionCreate) -> FormDefinition:
    form = FormDefinition(**data.model_dump())
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


def update(db: Session, form_id: int, data: FormDefinitionUpdate) -> FormDefinition:
    form = get_by_id(db, form_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(form, key, value)
    db.commit()
    db.refresh(form)
    return form


def delete(db: Session, form_id: int) -> dict:
    form = get_by_id(db, form_id)
    db.delete(form)
    db.commit()
    return {"message": "Form deleted successfully", "id": form_id}


def toggle_active(db: Session, form_id: int) -> FormDefinition:
    form = get_by_id(db, form_id)
    form.is_active = not form.is_active
    db.commit()
    db.refresh(form)
    return form