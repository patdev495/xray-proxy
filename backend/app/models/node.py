from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    host: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(100), default="", nullable=False)
    flag: Mapped[str] = mapped_column(String(10), default="🌐", nullable=False)
    grpc_port: Mapped[int] = mapped_column(Integer, default=10085, nullable=False)
    inbound_port: Mapped[int] = mapped_column(Integer, default=443, nullable=False)
    reality_private_key: Mapped[str] = mapped_column(String(100), nullable=False)
    reality_public_key: Mapped[str] = mapped_column(String(100), nullable=False)
    reality_short_id: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    sni_profiles: Mapped[list["SniProfile"]] = relationship(
        "SniProfile",
        back_populates="node",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class SniProfile(Base):
    __tablename__ = "sni_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    node_id: Mapped[int] = mapped_column(
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    carrier: Mapped[str] = mapped_column(String(100), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    port: Mapped[int] = mapped_column(Integer, default=443, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    node: Mapped["Node"] = relationship("Node", back_populates="sni_profiles")
