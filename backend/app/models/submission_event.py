from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class SubmissionEvent(Base):
    __tablename__ = 'submission_events'

    id             = Column(Integer, primary_key=True, index=True)
    submission_id  = Column(Integer, ForeignKey('form_submissions.id', ondelete='CASCADE'), nullable=False, index=True)
    event_type     = Column(String(30), nullable=False)  # submitted|declined|confirmed|edited|resubmitted
    actor_username = Column(String(100), nullable=False)
    comment        = Column(Text, nullable=True)
    occurred_at    = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
