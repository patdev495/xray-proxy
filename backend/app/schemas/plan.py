from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price_vnd: int = Field(default=0, ge=0)
    quota_gb: float = Field(default=50.0, ge=1.0)
    traffic_quota_gb: float | None = None
    days_valid: int = Field(default=30, ge=1)
    allowed_regions: list[str] = Field(default_factory=list)
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0)

    # Composite daily test tier
    enable_daily: bool = False
    price_daily_vnd: int | None = Field(default=None, ge=0)
    quota_daily_gb: float | None = Field(default=None, ge=0.1)
    quota_daily_bytes: int | None = None


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    price_vnd: int | None = Field(default=None, ge=0)
    quota_gb: float | None = Field(default=None, ge=1.0)
    traffic_quota_gb: float | None = None
    days_valid: int | None = Field(default=None, ge=1)
    allowed_regions: list[str] | None = None
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)

    enable_daily: bool | None = None
    price_daily_vnd: int | None = Field(default=None, ge=0)
    quota_daily_gb: float | None = Field(default=None, ge=0.1)
    quota_daily_bytes: int | None = None


class PlanResponse(PlanBase):
    id: int
    traffic_quota_bytes: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

