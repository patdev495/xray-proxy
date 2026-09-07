from pydantic import BaseModel, ConfigDict


class SystemSettingsUpdate(BaseModel):
    support_telegram_url: str = ""
    support_zalo_url: str = ""
    bank_id: str = "MB"
    bank_account_number: str = "0987654321"
    bank_account_name: str = "XRAY PROXY"
    bank_transfer_prefix: str = ""
    sepay_api_key: str = ""


class SystemSettingsResponse(BaseModel):
    support_telegram_url: str = ""
    support_zalo_url: str = ""
    bank_id: str = "MB"
    bank_account_number: str = "0987654321"
    bank_account_name: str = "XRAY PROXY"
    bank_transfer_prefix: str = ""
    sepay_api_key: str = ""

    model_config = ConfigDict(from_attributes=True)

