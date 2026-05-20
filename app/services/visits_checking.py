"""處理 Chrome 擴充功能 POST 過來的網址檢查(/visits)。

混合策略(方案 B):
    1. 用 URL 查 WEBSITE 表
    2. 找到 → 直接回傳既有 status / risk_score(快取命中,不重評)
    3. 沒找到 → 呼叫 scoring.run_scoring_pipeline() 完整評分(會自己寫入 WEBSITE,
       且會排一個背景深度分析任務)→ 回傳新分數

設計理由:已存在的 URL(尤其 NPA 名單那 3 萬筆)直接拿快取最快;
        只有未知 URL 才付出完整評分的代價(DNS、爬蟲、WHOIS)。
"""

from datetime import datetime

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.crud.website import get_website_by_url
from app.services.scoring import run_scoring_pipeline


def check_visit(
    db: Session,
    url: str,
    visited_at: datetime | None,
    background_tasks: BackgroundTasks,
    ip_address: str | None = None,
) -> dict:
    """檢查一筆瀏覽紀錄,回傳給 API 層的結構。"""
    timestamp = visited_at or datetime.now()

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
    print(f"📥 Visit ({tag}): {url}{ip_log} → {result['status']}/{result['risk_score']} @ {timestamp.isoformat()}")
    return result
