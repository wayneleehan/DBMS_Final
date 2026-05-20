"""處理 Chrome 擴充功能 POST 過來的網址檢查(/visits)。

流程:
    1. 用 URL 查 WEBSITE 表
    2. 找到 → 拿既有 status / risk_score / site_id 直接回
    3. 沒找到 → 呼叫 scoring.score_url() 評分 → 寫入 WEBSITE → 回新值

回傳給 API 層的結構,瀏覽器拿到後可以據此顯示警示(例如 status='Blocked' 就跳警告)。
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.crud.website import create_website, get_website_by_url
from app.services.scoring import score_url


def check_visit(db: Session, url: str, visited_at: datetime | None) -> dict:
    """檢查一筆瀏覽紀錄,回傳給 API 層的結構。"""
    timestamp = visited_at or datetime.now()

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
    print(f"📥 Visit ({tag}): {url} → {status}/{risk_score} @ {timestamp.isoformat()} (site_id={site_id})")
    return {
        "url": url,
        "status": status,
        "risk_score": risk_score,
        "is_new": is_new,
    }
