from sqlalchemy.orm import Session
from sqlalchemy import text

def count_recent_reports_for_cib(db: Session, site_id: int, seconds: int = 60) -> int:
    """
    計算特定網站最近 N 秒內，來自不同使用者的檢舉數量
    """
    query = text("""
        SELECT COUNT(DISTINCT User_ID) as distinct_users
        FROM Report
        WHERE Site_ID = :site_id
        AND Timestamp >= NOW() - INTERVAL :seconds SECOND
    """)
    result = db.execute(query, {"site_id": site_id, "seconds": seconds}).scalar()
    return result or 0
from datetime import datetime, timedelta
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

def count_recent_reports_by_user(db: Session, user_id: int, site_id: int, hours: int = 1):

    time_threshold = datetime.now() - timedelta(hours=hours)
    sql = text("""
        SELECT COUNT(*) FROM report 
        WHERE User_ID = :u_id AND Site_ID = :s_id AND Timestamp > :time
    """)
    result = db.execute(sql, {"u_id": user_id, "s_id": site_id, "time": time_threshold})
    return result.scalar()

