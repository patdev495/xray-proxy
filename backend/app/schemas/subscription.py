from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.subscription import SubscriptionStatus


class SubscriptionCreate(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100)
    quota_gb: float = Field(default=50.0, gt=0)
    days_valid: int = Field(default=30, gt=0)
    node_ids: list[int] | None = None


class SubscriptionUpdate(BaseModel):
    customer_name: str | None = Field(default=None, min_length=1, max_length=100)
    traffic_quota_gb: float | None = Field(default=None, gt=0)
    add_quota_gb: float | None = Field(default=None, ge=0)
    add_days: int | None = Field(default=None, ge=0)
    expires_at: datetime | None = None
    status: SubscriptionStatus | None = None
    node_ids: list[int] | None = None


class SubscriptionResponse(BaseModel):
    id: int
    customer_name: str
    token: str
    uuid: str
    traffic_quota_bytes: int
    traffic_used_bytes: int
    expires_at: datetime
    status: SubscriptionStatus
    created_at: datetime
    node_ids: list[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

