"""add track id

Revision ID: 5bbdd3bf399c
Revises: ee13a6ec7586
Create Date: 2023-11-10 19:23:25.033026

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5bbdd3bf399c'
down_revision: Union[str, None] = 'ee13a6ec7586'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('inference_hits', sa.Column('track_id', sa.Integer(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('inference_hits', 'track_id')
    # ### end Alembic commands ###
