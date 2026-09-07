from pydantic import BaseModel, ConfigDict


class SystemSettingsUpdate(BaseModel):
    support_telegram_url: str = ""
    support_zalo_url: str = ""
    bank_id: str = "MB"
    bank_account_number: str = "0987654321"
    bank_account_name: str = "XRAY PROXY"


class SystemSettingsResponse(BaseModel):
    support_telegram_url: str = ""
    support_zalo_url: str = ""
    bank_id: str = "MB"
    bank_account_number: str = "0987654321"
    bank_account_name: str = "XRAY PROXY"

    model_config = ConfigDict(from_attributes=True)

