"""add soft deletion for sources

Revision ID: dbb1f3f3cdc5
Revises: 5bbdd3bf399c
Create Date: 2023-11-11 12:04:47.936702

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dbb1f3f3cdc5'
down_revision: Union[str, None] = '5bbdd3bf399c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('camera_sources', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    op.add_column('video_sources', sa.Column('deleted_at', sa.DateTime(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('video_sources', 'deleted_at')
    op.drop_column('camera_sources', 'deleted_at')
    # ### end Alembic commands ###
