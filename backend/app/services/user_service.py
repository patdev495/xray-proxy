from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    """Find user by username."""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def authenticate_user(
    db: AsyncSession,
    username: str,
    password: str,
) -> User | None:
    """Verify username and password."""
    user = await get_user_by_username(db, username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None
    return user


async def seed_default_admin(db: AsyncSession) -> None:
    """Seed initial admin account if not already present."""
    existing_admin = await get_user_by_username(db, "admin")
    if not existing_admin:
        default_admin = User(
            username="admin",
            hashed_password=get_password_hash("adminpassword"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(default_admin)
        await db.commit()
