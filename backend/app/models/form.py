from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class FormDefinition(Base):
    """Admin-created forms (SurveyJS JSON)"""
    __tablename__ = "form_definitions"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    surveyjs_json = Column(JSON, nullable=False)  # SurveyJS schema
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    submissions = relationship("FormSubmission", back_populates="form")


class FormSubmission(Base):
    """User-filled forms"""
    __tablename__ = "form_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("form_definitions.id"), nullable=False, index=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    submission_data = Column(JSON, nullable=False)  # User's answers
    external_data = Column(JSON, nullable=True)  # API-fetched data
    
    email_sent = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    form = relationship("FormDefinition", back_populates="submissions")