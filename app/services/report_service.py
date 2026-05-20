"""處理使用者通報(POST /reports)的業務邏輯。

混合策略(方案 B):
    1. 用 URL 查 WEBSITE 表
    2. 找到 → 直接回傳既有 status / risk_score(快取命中,不重評)
    3. 沒找到 → 呼叫 scoring.run_scoring_pipeline() 完整評分(會自己寫入 WEBSITE,
       且會排一個背景深度分析任務)→ 回傳新分數

TODO(auth + Report 表寫入):
    完整需求其實還要把每次通報寫進 Report 表(crud/report.py 已備好 create_report()),
    但 Report.User_ID 是 NOT NULL 且 FK 到 USERS,目前還沒有登入機制可以提供 user_id。
    等 auth 接好之後,在這支 service 加回 create_report(db, user_id=current_user.id, site_id=..., ...)。
"""

from datetime import datetime

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.crud.website import get_website_by_url
from app.services.scoring import run_scoring_pipeline


def handle_report(
    db: Session,
    url: str,
    reported_at: datetime | None,
    background_tasks: BackgroundTasks,
    ip_address: str | None = None,
) -> dict:
    """處理一次使用者通報,回傳給 API 層的結構。"""
    timestamp = reported_at or datetime.now()

    existing = get_website_by_url(db, url)
    if existing:
        result = {
            "url": existing["URL"],
            "status": existing["Status"],
            "risk_score": float(existing["Risk_Score"]),
            "is_new": False,
        }
        tag = "cached"
    else:
        scored = run_scoring_pipeline(db, url, background_tasks, ip=ip_address)
        result = {
            "url": scored["URL"],
            "status": scored["Status"],
            "risk_score": float(scored["Risk_Score"]),
            "is_new": True,
        }
        tag = "new (scored)"

    ip_log = f" ip={ip_address}" if ip_address else ""
    print(f"📝 Report ({tag}): {url}{ip_log} → {result['status']}/{result['risk_score']} @ {timestamp.isoformat()}")
    return result
