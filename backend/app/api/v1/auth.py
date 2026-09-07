from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_current_user, get_db
from app.core.security import create_access_token
from app.models.user import User
from app.schemas.auth import (
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    Token,
    UserResponse,
)
from app.services.user_service import (
    authenticate_or_create_google_user,
    authenticate_user,
    create_customer_user,
    get_all_users,
    get_user_by_email,
    get_user_by_username,
)


router: APIRouter = APIRouter(prefix="/auth", tags=["auth"])
admin_router: APIRouter = APIRouter(
    prefix="/admin/users",
    tags=["admin-users"],
    dependencies=[Depends(get_current_admin)],
)


@admin_router.get("", response_model=list[UserResponse])
async def list_admin_users(
    db: AsyncSession = Depends(get_db),
) -> list[UserResponse]:
    """List all registered users for administration."""
    users = await get_all_users(db)
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            role=u.role.value,
            is_active=u.is_active,
            oauth_provider=u.oauth_provider,
        )
        for u in users
    ]


@router.post("/token", response_model=Token)
async def login_for_access_token(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """Authenticate user with username and password, return JWT token."""
    user = await authenticate_user(
        db,
        username=credentials.username,
        password=credentials.password,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/register", response_model=Token)
async def register_customer(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """Register a new customer account and return an active JWT session."""
    existing_user = await get_user_by_username(db, data.username)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    if data.email:
        existing_email = await get_user_by_email(db, data.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

    user = await create_customer_user(
        db,
        username=data.username,
        password=data.password,
        email=data.email,
    )

    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/google", response_model=Token)
async def login_with_google(
    data: GoogleLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> Token:
    """Exchange Google ID token for customer JWT session."""
    user = await authenticate_or_create_google_user(db, data.id_token)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)

async def read_users_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return currently authenticated user profile."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role.value,
        is_active=current_user.is_active,
        oauth_provider=current_user.oauth_provider,
    )

