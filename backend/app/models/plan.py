from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_vnd: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    traffic_quota_bytes: Mapped[int] = mapped_column(
        BigInteger, default=50 * 1024 * 1024 * 1024, nullable=False
    )
    days_valid: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    allowed_regions: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Composite daily test tier options
    enable_daily: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    price_daily_vnd: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quota_daily_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
