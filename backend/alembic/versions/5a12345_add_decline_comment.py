"""add_decline_comment_to_submissions

Revision ID: add_decline_comment
Revises: efc7223fb63e
Create Date: 2026-04-08

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_decline_comment'
down_revision = 'efc7223fb63e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('form_submissions', sa.Column('decline_comment', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('form_submissions', 'decline_comment')
