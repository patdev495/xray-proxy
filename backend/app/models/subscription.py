import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import BigInteger, Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.node import Node
    from app.models.plan import Plan
    from app.models.region import Region


subscription_nodes = Table(
    "subscription_nodes",
    Base.metadata,
    Column("subscription_id", Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), primary_key=True),
    Column("node_id", Integer, ForeignKey("nodes.id", ondelete="CASCADE"), primary_key=True),
)


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    EXPIRED = "EXPIRED"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    traffic_quota_bytes: Mapped[int] = mapped_column(BigInteger, default=50 * 1024 * 1024 * 1024, nullable=False)
    traffic_used_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(
        SQLEnum(SubscriptionStatus, native_enum=False),
        default=SubscriptionStatus.ACTIVE,
        nullable=False,
    )
    plan_id: Mapped[int | None] = mapped_column(
        ForeignKey("plans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    region_id: Mapped[int | None] = mapped_column(
        ForeignKey("regions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

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

    plan: Mapped["Plan | None"] = relationship("Plan", lazy="selectin")
    region: Mapped["Region | None"] = relationship("Region", lazy="selectin")

    nodes: Mapped[list["Node"]] = relationship(
        "Node",
        secondary=subscription_nodes,
        lazy="selectin",
    )

    @property
    def node_ids(self) -> list[int]:
        return [n.id for n in self.nodes] if self.nodes else []

    @property
    def plan_name(self) -> str | None:
        return self.plan.name if self.plan else None

    @property
    def region_code(self) -> str | None:
        return self.region.code if self.region else None

    @property
    def region_name(self) -> str | None:
        return self.region.name if self.region else None

    @property
    def region_flag(self) -> str | None:
        return self.region.flag if self.region else None

