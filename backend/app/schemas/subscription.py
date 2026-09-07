from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.subscription import SubscriptionStatus


class SubscriptionCreate(BaseModel):
    customer_name: str | None = Field(default=None, max_length=100)
    user_id: int | None = None
    create_order: bool = False
    quota_gb: float | None = Field(default=None, gt=0)
    days_valid: int | None = Field(default=None, gt=0)
    plan_id: int | None = None
    region_id: int | None = None
    node_ids: list[int] | None = None


class SubscriptionUpdate(BaseModel):
    customer_name: str | None = Field(default=None, min_length=1, max_length=100)
    traffic_quota_gb: float | None = Field(default=None, gt=0)
    add_quota_gb: float | None = Field(default=None, ge=0)
    add_days: int | None = Field(default=None, ge=0)
    expires_at: datetime | None = None
    status: SubscriptionStatus | None = None
    plan_id: int | None = None
    region_id: int | None = None
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
    node_names: list[str] = Field(default_factory=list)
    subscription_url: str | None = None
    plan_id: int | None = None
    plan_name: str | None = None
    region_id: int | None = None
    region_code: str | None = None
    region_name: str | None = None
    region_flag: str | None = None
    billing_cycle: str = "MONTHLY"
    is_renewable: bool = True
    user_id: int | None = None
    username: str | None = None

    model_config = ConfigDict(from_attributes=True)


class EligibleNodeResponse(BaseModel):
    id: int
    name: str
    host: str
    flag: str
    location: str
    available_slots: int
    max_subscriptions: int

    model_config = ConfigDict(from_attributes=True)


class SwitchNodeRequest(BaseModel):
    target_node_id: int = Field(..., description="ID of destination node in same region")


class RenewSubscriptionRequest(BaseModel):
    plan_id: int | None = Field(default=None, description="Optional new plan ID for renewal, defaults to current plan")

