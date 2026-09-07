from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class RegionBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    flag: str = Field(default="🌐", max_length=10)
    is_active: bool = True
    sort_order: int = Field(default=0, ge=0)


class RegionCreate(RegionBase):
    pass


class RegionUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=20)
    name: str | None = Field(default=None, min_length=1, max_length=100)
    flag: str | None = Field(default=None, max_length=10)
    is_active: bool | None = None
    sort_order: int | None = Field(default=None, ge=0)


class RegionResponse(RegionBase):
    id: int
    node_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
