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