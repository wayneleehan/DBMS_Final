from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session


def create_report(
    db: Session,
    user_id: int,
    site_id: int,
    evidence_path: str | None = None,
    reported_at: datetime | None = None,
) -> int:
    """新增一筆 Report 紀錄,回傳 Report_ID。

    每次使用者按下「舉報」就應該叫一次,不論該 URL 在 WEBSITE 表是否已存在。
    Report 表是「使用者通報行為」的 audit trail。
    """
    result = db.execute(
        text(
            "INSERT INTO Report (User_ID, Site_ID, Evidence_Path, Timestamp) "
            "VALUES (:user_id, :site_id, :evidence, :ts)"
        ),
        {
            "user_id": user_id,
            "site_id": site_id,
            "evidence": evidence_path,
            "ts": reported_at or datetime.now(),
        },
    )
    db.commit()
    return result.lastrowid
