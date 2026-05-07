from sqlalchemy import text
from sqlalchemy.orm import Session


def upsert_website_by_url(db: Session, url: str) -> int:
    """確保 URL 在 WEBSITE 表中存在,回傳對應的 Site_ID。

    已存在 → 直接回傳既有 Site_ID(不更新任何欄位)。
    不存在 → 以 Risk_Score=0 新增一筆,其餘欄位走 schema 預設(Status='Safe', IP_Address=NULL)。
    """
    existing = db.execute(
        text("SELECT Site_ID FROM WEBSITE WHERE URL = :url"),
        {"url": url},
    ).first()
    if existing:
        return existing[0]

    result = db.execute(
        text("INSERT INTO WEBSITE (URL, Risk_Score) VALUES (:url, 0)"),
        {"url": url},
    )
    db.commit()
    return result.lastrowid