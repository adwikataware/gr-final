"""Add enrichment fields to researchers table."""
from alembic import op
import sqlalchemy as sa

revision = "add_enrichment_fields"
down_revision = "79803942b7ff"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("researchers", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column("researchers", sa.Column("photo_url", sa.String(500), nullable=True))
    op.add_column("researchers", sa.Column("topics", sa.Text(), nullable=True))
    op.add_column("researchers", sa.Column("sdg_ids", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("researchers", "bio")
    op.drop_column("researchers", "photo_url")
    op.drop_column("researchers", "topics")
    op.drop_column("researchers", "sdg_ids")
