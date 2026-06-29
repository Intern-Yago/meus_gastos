"""switch_to_uuid

Revision ID: 9f68e91f3083
Revises: 1bfd28db1c16
Create Date: 2026-05-29 12:26:07.614098

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '9f68e91f3083'
down_revision: Union[str, Sequence[str], None] = '1bfd28db1c16'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Drop constraints first
    # We need to find the names of the foreign key constraints. 
    # Usually they are auto-named by SQLAlchemy/Alembic.
    # To keep it safe and simple, we'll try to drop them if we know the patterns, 
    # or we can just use raw SQL for Postgres which is more robust for type casting.

    # Enable pgcrypto for UUID generation if needed (optional but good practice)
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # TABLES to update
    tables = [
        ('accounts', 'user_id'),
        ('budgets', 'user_id'),
        ('categories', 'user_id'),
        ('goals', 'user_id'),
        ('notifications', 'user_id'),
        ('password_reset_tokens', 'user_id'),
        ('projects', 'user_id'),
        ('transactions', 'user_id'),
        ('user_memories', 'user_id')
    ]

    # For Postgres, we need to handle the conversion carefully.
    # Sequential IDs like '1' cannot be cast to UUID automatically.
    # We will generate new random UUIDs for existing users and update foreign keys.
    
    # 1. Create a temporary column to store the mapping
    op.add_column('users', sa.Column('new_id', sa.UUID(), nullable=True))
    op.execute('UPDATE users SET new_id = uuid_generate_v4()')
    
    # 2. Update all foreign keys using the mapping
    for table, col in tables:
        # Add temporary UUID column
        op.add_column(table, sa.Column('new_user_id', sa.UUID(), nullable=True))
        # Update with mapping
        op.execute(f'UPDATE {table} t SET new_user_id = u.new_id FROM users u WHERE t.{col} = u.id')
        # Drop old column and rename new one
        op.drop_column(table, col)
        op.alter_column(table, 'new_user_id', new_column_name=col, nullable=True)

    # 3. Handle users.id (Primary Key)
    # Drop primary key first
    op.execute('ALTER TABLE users DROP CONSTRAINT users_pkey CASCADE')
    op.drop_column('users', 'id')
    op.alter_column('users', 'new_id', new_column_name='id', nullable=False)
    op.execute('ALTER TABLE users ADD PRIMARY KEY (id)')

    # 4. Re-add foreign key constraints
    for table, col in tables:
        op.create_foreign_key(f'fk_{table}_user_id', table, 'users', [col], ['id'])

def downgrade() -> None:
    # This is a complex destructive change, downgrade would likely need to reverse the process
    # but since it's a security hardening, we often accept it's one-way or requires manual intervention.
    pass
