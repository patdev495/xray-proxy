from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PlanBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price_vnd: int = Field(default=0, ge=0)
    quota_gb: int = Field(default=50, ge=1)
    days_valid: int = Field(default=30, ge=1)
    allowed_regions: list[str] = Field(default_factory=list)
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0)


class PlanCreate(PlanBase):
    pass


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    price_vnd: int | None = Field(default=None, ge=0)
    quota_gb: int | None = Field(default=None, ge=1)
    days_valid: int | None = Field(default=None, ge=1)
    allowed_regions: list[str] | None = None
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)


class PlanResponse(PlanBase):
    id: int
    traffic_quota_bytes: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
