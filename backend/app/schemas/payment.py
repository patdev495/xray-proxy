from pydantic import BaseModel, Field


class SepayWebhookPayload(BaseModel):
    id: int | None = None
    gateway: str | None = None
    transactionDate: str | None = None
    accountNumber: str | None = None
    code: str | None = None
    content: str = Field(default="", description="Transfer remark text containing order code")
    transferType: str = Field(default="in", description="in for incoming transfer")
    transferAmount: int = Field(default=0, description="Transfer amount in VND")
    accumulated: int | None = None
    subAccount: str | None = None
    referenceCode: str | None = None
    description: str | None = None


class SepayWebhookResponse(BaseModel):
    success: bool
    message: str
    order_code: str | None = None
    subscription_id: int | None = None
