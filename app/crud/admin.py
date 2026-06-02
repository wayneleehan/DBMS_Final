from sqlalchemy import text, Connection

def get_admin_by_email(db: Connection, email: str) -> dict | None:
    """依 Email 查管理員,有就回 dict(含 Password_Hash),沒有回 None。
    給登入流程使用。
    """
    row = db.execute(
        text("""
            SELECT Admin_ID, Email, Name, Role, Password_Hash, Created_At
            FROM `ADMIN` WHERE Email = :email
        """),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def get_admin_by_id(db: Connection, admin_id: int) -> dict | None:
    """依 ID 查管理員(不含 Password_Hash,給 session 還原 admin info 用)。"""
    row = db.execute(
        text("""
           SELECT Admin_ID, Email, Name, Role, Password_Hash, Created_At
            FROM `ADMIN` WHERE Admin_ID = :admin_id
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
        w.Domain                                 AS domain,
        r.Category                               AS category,
        w.Status                                 AS website_status,
        w.Risk_Score                             AS risk_score,
        (SELECT COUNT(*) FROM Report rr WHERE rr.Site_ID = r.Site_ID)
                                                 AS report_count,
        EXISTS (
            SELECT 1 FROM EVALUATION ev
            WHERE ev.Site_ID = r.Site_ID AND ev.Pattern_ID = 3
        )                                        AS is_new_domain,
        r.Reason                                 AS reason,
        r.Evidence_Path                          AS evidence_path,
        NULL                                     AS appeal_evidence_link,
        r.Timestamp                              AS submitted_at,
        r.Report_ID                              AS sort_id,
        u.User_ID                                AS submitter_id,
        COALESCE(u.Name, '未知使用者')            AS submitter_name,
        u.Reliability_Score                      AS submitter_reputation
    FROM Report r
    JOIN WEBSITE w ON r.Site_ID = w.Site_ID
    JOIN USERS u   ON r.User_ID = u.User_ID
    WHERE w.Status IN ('Safe', 'Low_Risk', 'Warning')
      AND r.Status = 'Pending' 
      AND NOT EXISTS (SELECT 1 FROM APPEAL a WHERE a.Report_ID = r.Report_ID)
"""

_QUEUE_APPEALS_SQL = """
    SELECT
        CONCAT('A-', LPAD(a.Appeal_ID, 6, '0')) AS case_id,
        a.Appeal_ID                              AS raw_id,
        '申訴'                                   AS type,
        '申訴中'                                 AS case_status,
        w.URL                                    AS url,
        w.Domain                                 AS domain,
        r.Category                               AS category,
        w.Status                                 AS website_status,
        w.Risk_Score                             AS risk_score,
        (SELECT COUNT(*) FROM Report rr WHERE rr.Site_ID = r.Site_ID)
                                                 AS report_count,
        EXISTS (
            SELECT 1 FROM EVALUATION ev
            WHERE ev.Site_ID = r.Site_ID AND ev.Pattern_ID = 3
        )                                        AS is_new_domain,
        a.Reason                                 AS reason,
        r.Evidence_Path                          AS evidence_path,
        a.Evidence_Link                          AS appeal_evidence_link,
        r.Timestamp                              AS submitted_at,
        a.Appeal_ID                              AS sort_id,
        u.User_ID                                AS submitter_id,
        COALESCE(u.Name, '未知使用者')            AS submitter_name,
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

    order_clause = (
        "ORDER BY sort_id DESC"
        if status_filter == "申訴中"
        else "ORDER BY submitted_at DESC, sort_id DESC"
    )

    sql = text(f"""
        SELECT * FROM ({sql_body}) AS q
        {order_clause}
        LIMIT :limit
    """)
    rows = db.execute(sql, {"limit": limit}).mappings().all()
    result = []
    for row in rows:
        item = dict(row)
        item.pop("sort_id", None)
        item["evidence_urls"] = _split_evidence_urls(
            item.pop("evidence_path", None),
            item.pop("appeal_evidence_link", None),
        )
        result.append(item)
    return result


def get_review_queue_counts(db: Connection) -> dict:
    """佇列各狀態的計數,給前端篩選 chip 顯示用。"""
    pending = db.execute(text(f"SELECT COUNT(*) FROM ({_QUEUE_REPORTS_SQL}) q")).scalar() or 0
    appealing = db.execute(text(f"SELECT COUNT(*) FROM ({_QUEUE_APPEALS_SQL}) q")).scalar() or 0
    return {"pending": pending, "appealing": appealing}


def _split_evidence_urls(*values: str | None) -> list[str]:
    urls: list[str] = []
    for value in values:
        if not value:
            continue
        urls.extend(part.strip() for part in value.split(",") if part.strip())
    return urls


def get_case_history(db: Connection, case_type: str, raw_id: int) -> list[dict]:
    """回傳單一審核案件的歷史紀錄。

    case_type 是前端顯示的 '舉報' / '申訴'。申訴案件會先回推原始 Report,
    再用同一個 Report/Site 組出通報、申訴、裁決與風險分數變化。
    """
    base = _get_case_base(db, case_type, raw_id)
    if not base:
        return []

    report_id = base["Report_ID"]
    site_id = base["Site_ID"]
    events: list[dict] = []

    events.extend(_get_report_events(db, report_id))
    events.extend(_get_appeal_events(db, report_id))
    events.extend(_get_ruling_events(db, report_id))
    events.extend(_get_risk_history_events(db, site_id))
    events.extend(_get_audit_events(db, report_id, site_id))

    # 有時間的事件排前面並依時間倒序；沒有 timestamp 的 ruling/audit 放後面。
    return sorted(
        events,
        key=lambda e: (e["sort_time"] is not None, e["sort_time"] or "", e["sort_id"]),
        reverse=True,
    )


def _get_case_base(db: Connection, case_type: str, raw_id: int) -> dict | None:
    if case_type == "舉報":
        sql = text("""
            SELECT Report_ID, Site_ID
            FROM Report
            WHERE Report_ID = :raw_id
        """)
    else:
        sql = text("""
            SELECT r.Report_ID, r.Site_ID
            FROM APPEAL a
            JOIN Report r ON a.Report_ID = r.Report_ID
            WHERE a.Appeal_ID = :raw_id
        """)
    row = db.execute(sql, {"raw_id": raw_id}).mappings().first()
    return dict(row) if row else None


def _get_report_events(db: Connection, report_id: int) -> list[dict]:
    rows = db.execute(text("""
        SELECT r.Report_ID, r.Category, r.Reason, r.Timestamp, u.User_ID,
               COALESCE(u.Name, '未知使用者') AS User_Name
        FROM Report r
        JOIN USERS u ON r.User_ID = u.User_ID
        WHERE r.Report_ID = :report_id
    """), {"report_id": report_id}).mappings().all()
    return [
        _event(
            sort_time=row["Timestamp"],
            sort_id=row["Report_ID"],
            tone="orange",
            time=_format_time(row["Timestamp"]),
            title=f"{row['User_Name']} 提交舉報",
            detail=row["Reason"] or row["Category"] or "使用者提交網址舉報",
        )
        for row in rows
    ]


def _get_appeal_events(db: Connection, report_id: int) -> list[dict]:
    rows = db.execute(text("""
        SELECT Appeal_ID, Reason, Status
        FROM APPEAL
        WHERE Report_ID = :report_id
        ORDER BY Appeal_ID DESC
    """), {"report_id": report_id}).mappings().all()
    return [
        _event(
            sort_time=None,
            sort_id=row["Appeal_ID"],
            tone="info",
            time="—",
            title=f"使用者提交申訴 A-{int(row['Appeal_ID']):06d}",
            detail=f"{row['Status']} · {row['Reason'] or '未填寫申訴理由'}",
        )
        for row in rows
    ]


def _get_ruling_events(db: Connection, report_id: int) -> list[dict]:
    rows = db.execute(text("""
        SELECT ru.Ruling_ID, ru.Result, ru.Appeal_ID,
               COALESCE(ad.Name, '管理員') AS Admin_Name
        FROM ruling ru
        JOIN APPEAL a ON ru.Appeal_ID = a.Appeal_ID
        LEFT JOIN `ADMIN` ad ON ru.Admin_ID = ad.Admin_ID
        WHERE a.Report_ID = :report_id
        ORDER BY ru.Ruling_ID DESC
    """), {"report_id": report_id}).mappings().all()
    return [
        _event(
            sort_time=None,
            sort_id=row["Ruling_ID"],
            tone="warn",
            time="—",
            title=f"{row['Admin_Name']} 裁決申訴 A-{int(row['Appeal_ID']):06d}",
            detail=row["Result"] or "未留下裁決說明",
        )
        for row in rows
    ]


def _get_risk_history_events(db: Connection, site_id: int) -> list[dict]:
    rows = db.execute(text("""
        SELECT History_ID, Old_score, New_score, Timestamp
        FROM Risk_History
        WHERE Site_ID = :site_id
        ORDER BY Timestamp DESC, History_ID DESC
        LIMIT 10
    """), {"site_id": site_id}).mappings().all()
    return [
        _event(
            sort_time=row["Timestamp"],
            sort_id=row["History_ID"],
            tone="warn" if float(row["New_score"] or 0) >= float(row["Old_score"] or 0) else "",
            time=_format_time(row["Timestamp"]),
            title="網站風險分數更新",
            detail=f"{float(row['Old_score'] or 0):.0f} → {float(row['New_score'] or 0):.0f}",
        )
        for row in rows
    ]


def _get_audit_events(db: Connection, report_id: int, site_id: int) -> list[dict]:
    rows = db.execute(text("""
        SELECT al.Log_ID, al.Action_Type, al.New_Data, COALESCE(ad.Name, '管理員') AS Admin_Name
        FROM AUDIT_LOG al
        LEFT JOIN `ADMIN` ad ON al.Admin_ID = ad.Admin_ID
        WHERE al.Action_Type IN ('REVIEW_REPORT', 'REVIEW_APPEAL')
          AND (
            CAST(JSON_UNQUOTE(JSON_EXTRACT(al.New_Data, '$.report_id')) AS UNSIGNED) = :report_id
            OR CAST(JSON_UNQUOTE(JSON_EXTRACT(al.New_Data, '$.site_id')) AS UNSIGNED) = :site_id
          )
        ORDER BY al.Log_ID DESC
        LIMIT 10
    """), {"report_id": report_id, "site_id": site_id}).mappings().all()

    events = []
    for row in rows:
        new_data = _parse_json(row["New_Data"])
        if row["Action_Type"] == "REVIEW_APPEAL":
            title = f"{row['Admin_Name']} 審核申訴"
            detail = new_data.get("ruling") or new_data.get("appeal_status") or "申訴審核完成"
        else:
            title = f"{row['Admin_Name']} 審核舉報"
            detail = new_data.get("note") or new_data.get("verdict") or "舉報審核完成"
        events.append(_event(None, row["Log_ID"], "safe", "—", title, detail))
    return events


def _event(sort_time, sort_id: int, tone: str, time: str, title: str, detail: str) -> dict:
    return {
        "sort_time": sort_time.isoformat() if sort_time else None,
        "sort_id": int(sort_id or 0),
        "tone": tone,
        "time": time,
        "title": title,
        "detail": detail,
    }


def _format_time(value) -> str:
    return value.strftime("%Y-%m-%d %H:%M") if value else "—"


def _parse_json(value) -> dict:
    if not value:
        return {}
    import json
    try:
        return json.loads(value)
    except (TypeError, json.JSONDecodeError):
        return {}
