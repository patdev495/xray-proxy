from typing import Any
import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole



async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    """Find user by username."""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Find user by email."""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_oauth(
    db: AsyncSession, provider: str, oauth_id: str
) -> User | None:
    """Find user by OAuth provider and oauth_id."""
    result = await db.execute(
        select(User).where(
            User.oauth_provider == provider,
            User.oauth_id == oauth_id,
        )
    )
    return result.scalar_one_or_none()


async def create_customer_user(
    db: AsyncSession,
    username: str,
    password: str,
    email: str | None = None,
) -> User:
    """Create a new customer user with hashed password."""
    user = User(
        username=username,
        hashed_password=get_password_hash(password),
        email=email,
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(
    db: AsyncSession,
    username: str,
    password: str,
) -> User | None:
    """Verify username and password."""
    user = await get_user_by_username(db, username)
    if not user:
        return None
    if not user.hashed_password:
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


async def verify_google_token(
    id_token: str,
    expected_client_id: str | None = None,
) -> dict[str, Any]:
    """Verify Google OAuth ID token using Google tokeninfo API."""
    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
    async with httpx.AsyncClient() as client:
        res = await client.get(url, timeout=10.0)
        if res.status_code != 200:
            raise ValueError("Token is invalid or expired")
        payload: dict[str, Any] = res.json()

    if expected_client_id and payload.get("aud") != expected_client_id:
        raise ValueError("Token audience does not match configured google_client_id")

    return payload


async def authenticate_or_create_google_user(
    db: AsyncSession,
    id_token: str,
) -> User:
    """Exchange Google ID token for authenticated User session."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google authentication is not configured",
        )

    try:
        payload = await verify_google_token(id_token, settings.google_client_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        ) from e

    oauth_id: str = str(payload.get("sub", ""))
    email: str | None = payload.get("email")
    if not oauth_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token: missing sub",
        )

    # 1. Match by provider + oauth_id
    user = await get_user_by_oauth(db, provider="google", oauth_id=oauth_id)
    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )
        return user

    # 2. Match by email if user registered previously with same email
    if email:
        user_by_email = await get_user_by_email(db, email=email)
        if user_by_email:
            user_by_email.oauth_provider = "google"
            user_by_email.oauth_id = oauth_id
            await db.commit()
            await db.refresh(user_by_email)
            return user_by_email

    # 3. Create new customer user
    base_username = email.split("@")[0] if email else f"google_{oauth_id[:8]}"
    username = base_username
    counter = 1
    while await get_user_by_username(db, username):
        username = f"{base_username}_{counter}"
        counter += 1

    new_user = User(
        username=username,
        email=email,
        oauth_provider="google",
        oauth_id=oauth_id,
        hashed_password=None,
        role=UserRole.CUSTOMER,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user

