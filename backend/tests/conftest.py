from collections.abc import AsyncGenerator
import pytest
from app.core.database import AsyncSessionLocal, init_db
from app.services.user_service import seed_default_admin


@pytest.fixture(autouse=True)
async def setup_test_db() -> AsyncGenerator[None, None]:
    """Initialize database tables and default admin for tests."""
    await init_db()
    async with AsyncSessionLocal() as session:
        await seed_default_admin(session)
    yield
