from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class OrderCreate(BaseModel):
    plan_id: int = Field(..., description="ID of selected Plan")
    region: str = Field(..., min_length=2, max_length=10, description="Selected Region code (e.g. VN)")
    billing_cycle: str = Field(default="MONTHLY", description="Billing cycle: MONTHLY or DAILY")
    duration_days: int | None = Field(default=None, ge=1, le=365, description="Number of days for subscription; if omitted, defaults to 1 for DAILY and plan.days_valid for MONTHLY")
    subscription_id: int | None = Field(default=None, description="Optional Subscription ID for in-place renewal")


class OrderResponse(BaseModel):
    id: int
    code: str
    user_id: int
    username: str | None = None
    plan_id: int
    plan_name: str
    region: str
    billing_cycle: str = "MONTHLY"
    duration_days: int = 1
    amount_vnd: int
    status: str
    subscription_id: int | None = None
    subscription_token: str | None = None
    subscription_url: str | None = None
    created_at: datetime
    expires_at: datetime
    vietqr_url: str
    bank_id: str
    bank_account_number: str
    bank_account_name: str
    transfer_content: str

    model_config = ConfigDict(from_attributes=True)
