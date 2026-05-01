"""widen_id_columns

Revision ID: 8ee97c31e90d
Revises: add_enrichment_fields
Create Date: 2026-05-01 17:30:29.923805

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8ee97c31e90d'
down_revision: Union[str, Sequence[str], None] = 'add_enrichment_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('researchers', 'openalex_id', type_=sa.String(100), existing_nullable=True)
    op.alter_column('researchers', 'google_scholar_id', type_=sa.String(128), existing_nullable=True)


def downgrade() -> None:
    op.alter_column('researchers', 'openalex_id', type_=sa.String(50), existing_nullable=True)
    op.alter_column('researchers', 'google_scholar_id', type_=sa.String(20), existing_nullable=True)
