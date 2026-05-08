from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta

def count_recent_reports_by_user(db: Session, user_id: int, site_id: int, hours: int = 1):

    time_threshold = datetime.now() - timedelta(hours=hours)
    sql = text("""
        SELECT COUNT(*) FROM report 
        WHERE User_ID = :u_id AND Site_ID = :s_id AND Timestamp > :time
    """)
    result = db.execute(sql, {"u_id": user_id, "s_id": site_id, "time": time_threshold})
    return result.scalar()