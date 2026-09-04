import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_admin_login_success() -> None:
    """Admin login with valid credentials returns JWT token."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/v1/auth/token",
            json={"username": "admin", "password": "adminpassword"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_admin_login_invalid_password() -> None:
    """Login with invalid password returns 401 Unauthorized."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/v1/auth/token",
            json={"username": "admin", "password": "wrongpassword"},
        )
        assert response.status_code == 401
        data = response.json()
        assert data["detail"] == "Incorrect username or password"


@pytest.mark.asyncio
async def test_read_current_user_profile() -> None:
    """Authenticated request to /auth/me returns current user profile."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        # Login first
        login_res = await client.post(
            "/api/v1/auth/token",
            json={"username": "admin", "password": "adminpassword"},
        )
        token = login_res.json()["access_token"]

        # Call /me
        me_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_res.status_code == 200
        user_data = me_res.json()
        assert user_data["username"] == "admin"
        assert user_data["role"] == "ADMIN"
        assert user_data["is_active"] is True


@pytest.mark.asyncio
async def test_read_current_user_unauthorized() -> None:
    """Unauthenticated request to /auth/me returns 401."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        me_res = await client.get("/api/v1/auth/me")
        assert me_res.status_code == 401
