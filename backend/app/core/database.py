from collections.abc import AsyncGenerator
from sqlalchemy import Connection
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

        def _migrate(connection: Connection) -> None:
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
                if "user_id" not in sub_cols:
                    connection.execute(text("ALTER TABLE subscriptions ADD COLUMN user_id INTEGER REFERENCES users(id)"))

            # 4. Orders migrations
            if "orders" in table_names:
                order_cols = [c["name"] for c in insp.get_columns("orders")]
                if "subscription_id" not in order_cols:
                    connection.execute(text("ALTER TABLE orders ADD COLUMN subscription_id INTEGER REFERENCES subscriptions(id)"))

            # 5. SNI profiles migrations
            if "sni_profiles" in table_names:
                cols = [c["name"] for c in insp.get_columns("sni_profiles")]
                if "port" not in cols:
                    connection.execute(text("ALTER TABLE sni_profiles ADD COLUMN port INTEGER NOT NULL DEFAULT 443"))

            # 6. Users table migrations (for OAuth and Customer Onboarding)
            if "users" in table_names:
                user_cols = [c["name"] for c in insp.get_columns("users")]
                if "email" not in user_cols:
                    connection.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR(255)"))
                    connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
                if "oauth_provider" not in user_cols:
                    connection.execute(text("ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(50)"))
                if "oauth_id" not in user_cols:
                    connection.execute(text("ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255)"))
                    connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_oauth_id ON users (oauth_id)"))


        await conn.run_sync(_migrate)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
