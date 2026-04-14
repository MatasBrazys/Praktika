# app/models/form.py


from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base

class FormDefinition(Base):
    """Admin-created forms (SurveyJS JSON)"""
    __tablename__ = "form_definitions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    surveyjs_json = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class FormSubmission(Base):
    """User-filled forms"""
    __tablename__ = "form_submissions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey('form_definitions.id', ondelete='CASCADE'), nullable=False, index=True)
    form_type = Column(String(50), nullable=False)
    data = Column(JSON, nullable=False)
    status = Column(String(20), default='pending', nullable=False)
    decline_comment = Column(Text, nullable=True)
    
    submitted_by_username = Column(String(100), nullable=True, index=True)
    submitted_by_email = Column(String(255), nullable=True)
    updated_by_username = Column(String(100), nullable=True)
    updated_by_email = Column(String(255), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class FormConfirmation(Base):
    """Tracker for which users have confirmed which forms"""
    __tablename__ = "form_confirmations"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey('form_definitions.id', ondelete='CASCADE'), nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    submission_id = Column(Integer, ForeignKey('form_submissions.id', ondelete='SET NULL'), nullable=True)
    confirmed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Ensure a user can only confirm a form once
    __table_args__ = (UniqueConstraint('form_id', 'username', name='_form_user_uc'),)