"""處理使用者通報(POST /reports)的業務邏輯。

流程:
    1. 用 URL 查 WEBSITE 表
    2. 找到 → 拿既有 status / risk_score / site_id
    3. 沒找到 → 呼叫 scoring.score_url() 評分 → 寫入 WEBSITE

⚠️ TODO(auth + Report 表寫入):
   完整需求其實還要把每次通報寫進 Report 表(crud/report.py 已備好 create_report()),
   但 Report.User_ID 是 NOT NULL 且 FK 到 USERS,**目前還沒有登入機制可以提供 user_id**。
   等 auth 接好之後,在這支 service 加回 create_report(db, user_id=current_user.id, site_id=site_id, ...)。
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.crud.website import create_website, get_website_by_url
from app.services.scoring import score_url


def handle_report(db: Session, url: str, reported_at: datetime | None) -> dict:
    """處理一次使用者通報,回傳給 API 層的結構。"""
    timestamp = reported_at or datetime.now()

    existing = get_website_by_url(db, url)
    if existing:
        site_id = existing["Site_ID"]
        status = existing["Status"]
        risk_score = float(existing["Risk_Score"])
        is_new = False
    else:
        status, risk_score = score_url(url)
        site_id = create_website(db, url=url, status=status, risk_score=risk_score)
        is_new = True

    tag = "new" if is_new else "existing"
    print(f"📝 Report ({tag}): {url} → {status}/{risk_score} @ {timestamp.isoformat()} (site_id={site_id})")
    return {
        "url": url,
        "status": status,
        "risk_score": risk_score,
        "is_new": is_new,
    }
