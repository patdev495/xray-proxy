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


@pytest.mark.asyncio
async def test_customer_registration_success() -> None:
    """Customer registration creates user with CUSTOMER role and returns valid token."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        reg_res = await client.post(
            "/api/v1/auth/register",
            json={
                "username": "customer1",
                "password": "customerpassword123",
                "email": "customer1@example.com",
            },
        )
        assert reg_res.status_code == 200
        token_data = reg_res.json()
        assert "access_token" in token_data
        assert token_data["token_type"] == "bearer"

        # Verify /auth/me with the issued token
        me_res = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
        assert me_res.status_code == 200
        user_info = me_res.json()
        assert user_info["username"] == "customer1"
        assert user_info["role"] == "CUSTOMER"
        assert user_info["email"] == "customer1@example.com"
        assert user_info["is_active"] is True


@pytest.mark.asyncio
async def test_customer_registration_duplicate_username() -> None:
    """Registering with an already existing username fails with 409 Conflict."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        # Register first
        await client.post(
            "/api/v1/auth/register",
            json={"username": "dupeuser", "password": "password123"},
        )
        # Register second time
        res = await client.post(
            "/api/v1/auth/register",
            json={"username": "dupeuser", "password": "otherpassword"},
        )
        assert res.status_code == 409
        assert "Username already taken" in res.json()["detail"]


@pytest.mark.asyncio
async def test_customer_registration_duplicate_email() -> None:
    """Registering with an already existing email fails with 409 Conflict."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        await client.post(
            "/api/v1/auth/register",
            json={"username": "user_a", "password": "password123", "email": "same@example.com"},
        )
        res = await client.post(
            "/api/v1/auth/register",
            json={"username": "user_b", "password": "password123", "email": "same@example.com"},
        )
        assert res.status_code == 409
        assert "Email already registered" in res.json()["detail"]


@pytest.mark.asyncio
async def test_google_login_unconfigured_returns_503(monkeypatch: pytest.MonkeyPatch) -> None:
    """When google_client_id is not set, /auth/google returns 503 Service Unavailable."""
    from app.core.config import settings

    monkeypatch.setattr(settings, "google_client_id", None)
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        res = await client.post(
            "/api/v1/auth/google",
            json={"id_token": "mock-token"},
        )
        assert res.status_code == 503
        assert "Google authentication is not configured" in res.json()["detail"]


@pytest.mark.asyncio
async def test_google_login_success_new_and_existing_user(monkeypatch: pytest.MonkeyPatch) -> None:
    """Valid Google token provisions new CUSTOMER and re-authenticates existing."""
    from app.core.config import settings
    import app.services.user_service as user_service

    monkeypatch.setattr(settings, "google_client_id", "test-client-id.apps.googleusercontent.com")

    # Mock token verification
    async def mock_verify(id_token: str, expected_client_id: str | None) -> dict[str, str]:
        if id_token == "valid-google-token":
            return {
                "sub": "google-uid-999",
                "email": "oauthuser@gmail.com",
                "name": "OAuth User",
                "aud": "test-client-id.apps.googleusercontent.com",
            }
        raise ValueError("Invalid Google token")

    monkeypatch.setattr(user_service, "verify_google_token", mock_verify)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        # First login -> creates new customer
        res1 = await client.post(
            "/api/v1/auth/google",
            json={"id_token": "valid-google-token"},
        )
        assert res1.status_code == 200
        token_data1 = res1.json()
        assert "access_token" in token_data1

        me1 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_data1['access_token']}"},
        )
        assert me1.status_code == 200
        user1 = me1.json()
        assert user1["email"] == "oauthuser@gmail.com"
        assert user1["role"] == "CUSTOMER"
        assert user1["oauth_provider"] == "google"

        # Second login with same token -> logs into same customer
        res2 = await client.post(
            "/api/v1/auth/google",
            json={"id_token": "valid-google-token"},
        )
        assert res2.status_code == 200
        token_data2 = res2.json()

        me2 = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token_data2['access_token']}"},
        )
        assert me2.json()["id"] == user1["id"]


@pytest.mark.asyncio
async def test_google_login_invalid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """Invalid Google token returns 401 Unauthorized."""
    from app.core.config import settings
    import app.services.user_service as user_service

    monkeypatch.setattr(settings, "google_client_id", "test-client-id.apps.googleusercontent.com")

    async def mock_verify_invalid(id_token: str, expected_client_id: str | None) -> dict[str, str]:
        raise ValueError("Token is invalid or expired")

    monkeypatch.setattr(user_service, "verify_google_token", mock_verify_invalid)

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        res = await client.post(
            "/api/v1/auth/google",
            json={"id_token": "bad-token"},
        )
        assert res.status_code == 401
        assert "Invalid Google ID token" in res.json()["detail"]


