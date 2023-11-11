"""add private url to camera sources

Revision ID: a9018dfe0447
Revises: 148e581b9765
Create Date: 2023-11-11 22:14:19.542577

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a9018dfe0447'
down_revision: Union[str, None] = '148e581b9765'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('camera_sources', sa.Column('private_url', sa.String(), nullable=True))
    op.alter_column('camera_sources', 'url',
               existing_type=sa.VARCHAR(),
               comment='Stripped of basic auth to display in user interface',
               existing_nullable=True)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('camera_sources', 'url',
               existing_type=sa.VARCHAR(),
               comment=None,
               existing_comment='Stripped of basic auth to display in user interface',
               existing_nullable=True)
    op.drop_column('camera_sources', 'private_url')
    # ### end Alembic commands ###