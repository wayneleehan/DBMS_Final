from sqlalchemy import text, Connection

def get_admin_by_email(db: Connection, email: str) -> dict | None:
    """依 Email 查管理員,有就回 dict(含 Password_Hash),沒有回 None。
    給登入流程使用。
    """
    row = db.execute(
        text("""
            SELECT Admin_ID, Name, Role
            FROM ADMIN WHERE Name = :email
        """),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def get_admin_by_id(db: Connection, admin_id: int) -> dict | None:
    """依 ID 查管理員(不含 Password_Hash,給 session 還原 admin info 用)。"""
    row = db.execute(
        text("""
            SELECT Admin_ID, Name, Role
            FROM ADMIN WHERE Admin_ID = :admin_id
        """),
        {"admin_id": admin_id},
    ).mappings().first()
    return dict(row) if row else None


# ------------------------------------------------------------------
# 審核佇列:UNION ALL 把「待審核的 Report」與「進行中的 Appeal」合一
# 跨多張表的 view-like 查詢,放在 admin crud 因為這是 admin 視角的資料
# ------------------------------------------------------------------

# UNION 兩條 SELECT 的子句拆開重用
_QUEUE_REPORTS_SQL = """
    SELECT
        CONCAT('R-', LPAD(r.Report_ID, 6, '0')) AS case_id,
        r.Report_ID                              AS raw_id,
        '舉報'                                   AS type,
        '待審核'                                 AS case_status,
        w.URL                                    AS url,
        r.Category                               AS category,
        w.Status                                 AS website_status,
        w.Risk_Score                             AS risk_score,
        r.Reason                                 AS reason,
        r.Timestamp                              AS submitted_at,
        u.User_ID                                AS submitter_id,
        u.Name                                   AS submitter_name,
        u.Reliability_Score                      AS submitter_reputation
    FROM Report r
    JOIN WEBSITE w ON r.Site_ID = w.Site_ID
    JOIN USERS u   ON r.User_ID = u.User_ID
    WHERE w.Status IN ('Safe', 'Low_Risk', 'Warning')
      AND NOT EXISTS (SELECT 1 FROM APPEAL a WHERE a.Report_ID = r.Report_ID)
"""

_QUEUE_APPEALS_SQL = """
    SELECT
        CONCAT('A-', LPAD(a.Appeal_ID, 6, '0')) AS case_id,
        a.Appeal_ID                              AS raw_id,
        '申訴'                                   AS type,
        '申訴中'                                 AS case_status,
        w.URL                                    AS url,
        r.Category                               AS category,
        w.Status                                 AS website_status,
        w.Risk_Score                             AS risk_score,
        a.Reason                                 AS reason,
        r.Timestamp                              AS submitted_at,
        u.User_ID                                AS submitter_id,
        u.Name                                   AS submitter_name,
        u.Reliability_Score                      AS submitter_reputation
    FROM APPEAL a
    JOIN Report r  ON a.Report_ID = r.Report_ID
    JOIN WEBSITE w ON r.Site_ID = w.Site_ID
    JOIN USERS u   ON r.User_ID = u.User_ID
    WHERE a.Status IN ('Pending', 'In_Review')
"""


def get_review_queue(
    db: Connection, status_filter: str | None = None, limit: int = 50
) -> list[dict]:
    """回傳待審核佇列。
    status_filter 可以是 '待審核' / '申訴中' / None(全部)。
    """
    # 依篩選決定要 UNION 哪幾條
    if status_filter == "待審核":
        sql_body = _QUEUE_REPORTS_SQL
    elif status_filter == "申訴中":
        sql_body = _QUEUE_APPEALS_SQL
    else:
        sql_body = f"{_QUEUE_REPORTS_SQL} UNION ALL {_QUEUE_APPEALS_SQL}"

    sql = text(f"""
        SELECT * FROM ({sql_body}) AS q
        ORDER BY submitted_at DESC
        LIMIT :limit
    """)
    rows = db.execute(sql, {"limit": limit}).mappings().all()
    return [dict(r) for r in rows]


def get_review_queue_counts(db: Connection) -> dict:
    """佇列各狀態的計數,給前端篩選 chip 顯示用。"""
    pending = db.execute(text(f"SELECT COUNT(*) FROM ({_QUEUE_REPORTS_SQL}) q")).scalar() or 0
    appealing = db.execute(text(f"SELECT COUNT(*) FROM ({_QUEUE_APPEALS_SQL}) q")).scalar() or 0
    return
