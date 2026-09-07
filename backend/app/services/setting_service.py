from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import SystemSetting


DEFAULT_SETTINGS: dict[str, str] = {
    "support_telegram_url": "",
    "support_zalo_url": "",
    "bank_id": "MB",
    "bank_account_number": "0987654321",
    "bank_account_name": "XRAY PROXY",
    "sepay_api_key": "",
}



async def get_system_settings(db: AsyncSession) -> dict[str, str]:
    """Retrieve system settings as a dictionary."""
    stmt = select(SystemSetting)
    result = await db.execute(stmt)
    rows = list(result.scalars().all())

    settings = dict(DEFAULT_SETTINGS)
    for r in rows:
        settings[r.key] = r.value
    return settings


async def update_system_settings(db: AsyncSession, updates: dict[str, str]) -> dict[str, str]:
    """Upsert key-value pairs into system_settings."""
    for key, val in updates.items():
        stmt = select(SystemSetting).where(SystemSetting.key == key)
        result = await db.execute(stmt)
        setting = result.scalar_one_or_none()
        if setting:
            setting.value = val or ""
        else:
            db.add(SystemSetting(key=key, value=val or ""))

    await db.commit()
    return await get_system_settings(db)
