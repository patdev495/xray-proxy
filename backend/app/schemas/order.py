from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class OrderCreate(BaseModel):
    plan_id: int = Field(..., description="ID of selected Plan")
    region: str = Field(..., min_length=2, max_length=10, description="Selected Region code (e.g. VN)")


class OrderResponse(BaseModel):
    id: int
    code: str
    user_id: int
    plan_id: int
    plan_name: str
    region: str
    amount_vnd: int
    status: str
    created_at: datetime
    expires_at: datetime
    vietqr_url: str
    bank_id: str
    bank_account_number: str
    bank_account_name: str

    model_config = ConfigDict(from_attributes=True)
