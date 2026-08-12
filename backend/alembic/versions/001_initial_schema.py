"""initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-12 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, server_default='normal'),
        sa.Column('is_admin', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('approved', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    op.create_table(
        'reports',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('user_email', sa.String(length=255), nullable=False),
        sa.Column('user_name', sa.String(length=255), nullable=False),
        sa.Column('location', sa.String(length=255), nullable=False),
        sa.Column('original_image', sa.Text(), nullable=False),
        sa.Column('processed_image', sa.Text(), nullable=False),
        sa.Column('has_crack', sa.Integer(), nullable=False),
        sa.Column('severity', sa.String(length=50), nullable=False),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('summary', sa.Text(), nullable=False),
        sa.Column('defects_json', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=100), nullable=False, server_default='Pending Assignment'),
        sa.Column('assigned_inspector', sa.String(length=255), nullable=True, server_default='Unassigned'),
        sa.Column('source', sa.String(length=100), nullable=False, server_default='Public Reporter'),
        sa.Column('created_at', sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reports_id'), 'reports', ['id'], unique=False)
    op.create_index(op.f('ix_reports_user_email'), 'reports', ['user_email'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_reports_user_email'), table_name='reports')
    op.drop_index(op.f('ix_reports_id'), table_name='reports')
    op.drop_table('reports')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
