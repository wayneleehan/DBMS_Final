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
    category: str | None = None,
    reason: str | None = None,
) -> int:
    """新增一筆 Report 紀錄,回傳 Report_ID。

    每次使用者按下「舉報」就應該叫一次,不論該 URL 在 WEBSITE 表是否已存在。
    Report 表是「使用者通報行為」的 audit trail。
    """
    result = db.execute(
        text(
            "INSERT INTO Report (User_ID, Site_ID, Category, Reason, Evidence_Path, Timestamp) "
            "VALUES (:user_id, :site_id, :category, :reason, :evidence, :ts)"
        ),
        {
            "user_id": user_id,
            "site_id": site_id,
            "category": category,
            "reason": reason,
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


def get_reports_with_website_by_user(
    db: Session, user_id: int, limit: int = 20
) -> list[dict]:
    """查使用者最近的通報紀錄,JOIN 上 WEBSITE 拿目前 status / risk_score。
    時間倒序,給個人頁的紀錄表用。
    """
    sql = text("""
        SELECT
            r.Report_ID, r.Category, r.Reason, r.Timestamp,
            w.URL, w.Status, w.Risk_Score
        FROM Report r
        JOIN WEBSITE w ON r.Site_ID = w.Site_ID
        WHERE r.User_ID = :user_id
        ORDER BY r.Timestamp DESC
        LIMIT :limit
    """)
    rows = db.execute(sql, {"user_id": user_id, "limit": limit}).mappings().all()
    return [dict(r) for r in rows]


def get_user_report_stats(db: Session, user_id: int) -> dict:
    """彙整使用者通報統計給個人頁顯示用。

    - total: 通報總筆數
    - approved: 通報的網站最終被判為高風險(Blocked / Warning)的不重複站數
    - rejected: 通報的網站最終被判為 Safe(誤報)的不重複站數
    - appeals: 跟使用者通報關聯的申訴筆數
    """
    sql = text("""
        SELECT
            (SELECT COUNT(*) FROM Report WHERE User_ID = :user_id) AS total,
            (SELECT COUNT(DISTINCT r.Site_ID)
               FROM Report r
               JOIN WEBSITE w ON r.Site_ID = w.Site_ID
               WHERE r.User_ID = :user_id AND w.Status IN ('Blocked', 'Warning')
            ) AS approved,
            (SELECT COUNT(DISTINCT r.Site_ID)
               FROM Report r
               JOIN WEBSITE w ON r.Site_ID = w.Site_ID
               WHERE r.User_ID = :user_id AND w.Status = 'Safe'
            ) AS rejected,
            (SELECT COUNT(*)
               FROM APPEAL a
               JOIN Report r ON a.Report_ID = r.Report_ID
               WHERE r.User_ID = :user_id
            ) AS appeals
    """)
    row = db.execute(sql, {"user_id": user_id}).mappings().first()
    # 用 dict 包一層並把 None 轉 0,前端不用做 null check
    return {k: int(v or 0) for k, v in dict(row).items()}

