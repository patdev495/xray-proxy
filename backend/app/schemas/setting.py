from pydantic import BaseModel, ConfigDict


class SystemSettingsUpdate(BaseModel):
    support_telegram_url: str = ""
    support_zalo_url: str = ""


class SystemSettingsResponse(BaseModel):
    support_telegram_url: str = ""
    support_zalo_url: str = ""

    model_config = ConfigDict(from_attributes=True)
