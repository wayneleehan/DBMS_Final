"""處理使用者通報(POST /reports)的業務邏輯。

混合策略(方案 B):
    1. 用 URL 查 WEBSITE 表
    2. 找到 → 直接拿既有 status / risk_score / site_id(快取命中,不重評)
    3. 沒找到 → 呼叫 scoring.run_scoring_pipeline() 完整評分 → 寫入 WEBSITE
    4. **不論新舊**,在 Report 表插一筆通報紀錄,留下 user 行為足跡
"""

import logging
from datetime import datetime

from fastapi import BackgroundTasks
from sqlalchemy import Connection

from app.crud.report import create_report
from app.crud.website import get_website_by_url
from app.services.scoring import run_scoring_pipeline

logger = logging.getLogger(__name__)


def handle_report(
    db: Connection,
    user_id: int,
    url: str,
    reported_at: datetime | None,
    background_tasks: BackgroundTasks,
    ip_address: str | None = None,
    category: str | None = None,
    reason: str | None = None,
) -> dict:
    """處理一次使用者通報,回傳給 API 層的結構。
    user_id 由 API 層從 session 帶入,service 不負責驗證身分。
    """
    timestamp = reported_at or datetime.now()

    existing = get_website_by_url(db, url)
    if existing:
        site_id = existing["Site_ID"]
        status = existing["Status"]
        risk_score = float(existing["Risk_Score"])
        is_new = False
    else:
        # run_scoring_pipeline 內部會自己 commit + 安排背景任務
        scored = run_scoring_pipeline(db, url, background_tasks, ip=ip_address)
        site_id = scored["Site_ID"]
        status = scored["Status"]
        risk_score = float(scored["Risk_Score"])
        is_new = True

    try:
        # 不論 WEBSITE 是快取命中還是新建,都要為這次「使用者通報」留紀錄
        create_report(
            db,
            user_id=user_id,
            site_id=site_id,
            reported_at=timestamp,
            category=category,
            reason=reason,
        )
        db.commit()
    except Exception:
        db.rollback()
        raise

    tag = "new (scored)" if is_new else "cached"
    ip_log = f" ip={ip_address}" if ip_address else ""
    logger.info(
        "Report (%s): user=%s %s%s → %s/%s @ %s",
        tag, user_id, url, ip_log, status, risk_score, timestamp.isoformat(),
    )
    return {
        "url": url,
        "status": status,
        "risk_score": risk_score,
        "is_new": is_new,
    }
