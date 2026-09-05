from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


engine: AsyncEngine = create_async_engine(
    settings.database_url,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {},
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Initialize database tables and apply schema updates if needed."""
    from sqlalchemy import inspect as sa_inspect, text

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def _migrate(connection) -> None:
            insp = sa_inspect(connection)
            if "sni_profiles" in insp.get_table_names():
                cols = [c["name"] for c in insp.get_columns("sni_profiles")]
                if "port" not in cols:
                    connection.execute(text("ALTER TABLE sni_profiles ADD COLUMN port INTEGER NOT NULL DEFAULT 443"))

        await conn.run_sync(_migrate)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
