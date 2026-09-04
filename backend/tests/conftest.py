from collections.abc import AsyncGenerator
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.database import AsyncSessionLocal, init_db
from app.core.security import create_access_token
from app.main import app
from app.services.user_service import seed_default_admin


@pytest.fixture(autouse=True)
async def setup_test_db() -> AsyncGenerator[None, None]:
    """Initialize database tables and default admin for tests."""
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_default_admin(session)
    yield


@pytest.fixture
def admin_token() -> str:
    """Generate a valid JWT token for admin."""
    return create_access_token({"sub": "admin"})


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP client for testing endpoints."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as c:
        yield c
