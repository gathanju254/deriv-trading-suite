# filepath: alembic/script.py.mako
"""Add refresh_expires_at column to user_sessions

Revision ID: e214fb18da87
Revises: 494d357f8dfd
Create Date: 2026-01-17 08:09:22.899756

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e214fb18da87'
down_revision = '494d357f8dfd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'user_sessions',
        sa.Column('refresh_expires_at', sa.DateTime(), nullable=True)
    )

def downgrade() -> None:
    op.drop_column('user_sessions', 'refresh_expires_at')