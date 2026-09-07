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
    import app.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        def _migrate(connection) -> None:
            insp = sa_inspect(connection)
            table_names = insp.get_table_names()

            # 1. Seed standard default regions if table is empty
            if "regions" in table_names:
                count_res = connection.execute(text("SELECT COUNT(*) FROM regions")).scalar()
                if count_res == 0:
                    connection.execute(text("""
                        INSERT INTO regions (code, name, flag, is_active, sort_order, created_at, updated_at)
                        VALUES 
                        ('VN', 'Việt Nam', '🇻🇳', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('SG', 'Singapore', '🇸🇬', 1, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('JP', 'Nhật Bản', '🇯🇵', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                        ('US', 'Hoa Kỳ', '🇺🇸', 1, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    """))

            # 2. Nodes migrations
            if "nodes" in table_names:
                node_cols = [c["name"] for c in insp.get_columns("nodes")]
                if "max_subscriptions" not in node_cols:
                    connection.execute(text("ALTER TABLE nodes ADD COLUMN max_subscriptions INTEGER NOT NULL DEFAULT 100"))
                if "region_id" not in node_cols:
                    connection.execute(text("ALTER TABLE nodes ADD COLUMN region_id INTEGER REFERENCES regions(id)"))

                # Backfill existing nodes to matching regions
                connection.execute(text("""
                    UPDATE nodes SET region_id = (SELECT id FROM regions WHERE code = 'VN')
                    WHERE region_id IS NULL AND (flag = '🇻🇳' OR location LIKE '%Vietnam%' OR location LIKE '%Việt Nam%')
                """))
                connection.execute(text("""
                    UPDATE nodes SET region_id = (SELECT id FROM regions WHERE code = 'SG')
                    WHERE region_id IS NULL AND (flag = '🇸🇬' OR location LIKE '%Singapore%')
                """))
                connection.execute(text("""
                    UPDATE nodes SET region_id = (SELECT id FROM regions WHERE code = 'JP')
                    WHERE region_id IS NULL AND (flag = '🇯🇵' OR location LIKE '%Japan%' OR location LIKE '%Tokyo%')
                """))
                connection.execute(text("""
                    UPDATE nodes SET region_id = (SELECT id FROM regions WHERE code = 'US')
                    WHERE region_id IS NULL AND (flag = '🇺🇸' OR location LIKE '%US%')
                """))

            # 3. Subscriptions migrations
            if "subscriptions" in table_names:
                sub_cols = [c["name"] for c in insp.get_columns("subscriptions")]
                if "plan_id" not in sub_cols:
                    connection.execute(text("ALTER TABLE subscriptions ADD COLUMN plan_id INTEGER REFERENCES plans(id)"))
                if "region_id" not in sub_cols:
                    connection.execute(text("ALTER TABLE subscriptions ADD COLUMN region_id INTEGER REFERENCES regions(id)"))

            # 4. SNI profiles migrations
            if "sni_profiles" in table_names:
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
