from __future__ import annotations

import csv
import sys
import time
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import engine


def upsert_website_by_url(db: Session, url: str) -> int:
    """確保 URL 在 WEBSITE 表中存在,回傳對應的 Site_ID。

    已存在 → 直接回傳既有 Site_ID(不更新任何欄位)。
    不存在 → 以 Risk_Score=0 新增一筆,其餘欄位走 schema 預設(Status='Safe', IP_Address=NULL)。
    """
    existing = db.execute(
        text("SELECT Site_ID FROM WEBSITE WHERE URL = :url"),
        {"url": url},
    ).first()
    if existing:
        return existing[0]

    result = db.execute(
        text("INSERT INTO WEBSITE (URL, Risk_Score) VALUES (:url, 0)"),
        {"url": url},
    )
    db.commit()
    return result.lastrowid


# ------------------------------------------------------------------
# /report API 用的查詢與新增(由 services/report_service.py 編排)
# ------------------------------------------------------------------


def get_website_by_url(db: Session, url: str) -> dict | None:
    """依 URL 查 WEBSITE,有的話回傳 dict,沒有回 None。"""
    row = db.execute(
        text("SELECT Site_ID, URL, Status, Risk_Score FROM WEBSITE WHERE URL = :url"),
        {"url": url},
    ).mappings().first()
    return dict(row) if row else None


def create_website(db: Session, url: str, status: str, risk_score: float) -> int:
    """新增一筆 WEBSITE,回傳 Site_ID。
    呼叫端要保證 URL 不存在(否則 UNIQUE 衝突會炸)。
    """
    result = db.execute(
        text(
            "INSERT INTO WEBSITE (URL, Status, Risk_Score) "
            "VALUES (:url, :status, :score)"
        ),
        {"url": url, "status": status, "score": risk_score},
    )
    db.commit()
    return result.lastrowid


# ------------------------------------------------------------------
# NPA_WEBURL.csv 匯入(警政署詐騙網站清單,一次性 bulk import)
# ------------------------------------------------------------------

_NPA_BATCH_SIZE = 1000
_NPA_RISK_MULTIPLIER = 5.0
_NPA_RISK_CAP = 100.0


def import_npa_websites_from_csv(csv_path: str | Path) -> tuple[int, int]:
    """讀 NPA_WEBURL.csv 並 bulk insert 進 WEBSITE 表。

    - URL 原樣存(跟 CSV 一致,不加 protocol)
    - Status 一律 'Blocked'(已知詐騙站)
    - Risk_Score = min(100, sum(CNT) × 5);同 URL 在 CSV 多筆會先合併
    - 用 INSERT IGNORE,既有 URL 會被跳過,重跑安全

    回傳 (新增筆數, 略過筆數)。
    """
    csv_path = Path(csv_path)
    if not csv_path.exists():
        raise FileNotFoundError(f"找不到檔案:{csv_path}")

    totals: dict[str, int] = {}
    # utf-8-sig 自動處理檔頭 BOM
    with csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader)  # 跳過第 1 列(英文欄名)
        next(reader)  # 跳過第 2 列(中文欄名描述)
        for row in reader:
            if len(row) < 3:
                continue
            url = row[1].strip()
            if not url:
                continue
            try:
                cnt = int(row[2])
            except ValueError:
                cnt = 0
            totals[url] = totals.get(url, 0) + cnt

    records = [
        {"url": url, "score": min(_NPA_RISK_CAP, total * _NPA_RISK_MULTIPLIER)}
        for url, total in totals.items()
    ]

    sql = text(
        "INSERT IGNORE INTO WEBSITE (URL, Status, Risk_Score) "
        "VALUES (:url, 'Blocked', :score)"
    )
    inserted = 0
    with engine.begin() as conn:
        for i in range(0, len(records), _NPA_BATCH_SIZE):
            chunk = records[i : i + _NPA_BATCH_SIZE]
            result = conn.execute(sql, chunk)
            inserted += result.rowcount or 0
            print(f"  ...已處理 {min(i + _NPA_BATCH_SIZE, len(records)):,}/{len(records):,}")

    skipped = len(records) - inserted
    return inserted, skipped


if __name__ == "__main__":
    # 從專案根直接執行:python -m app.crud.website
    project_root = Path(__file__).resolve().parents[2]
    default_csv = project_root / "NPA_WEBURL.csv"

    print(f"📄 讀取 {default_csv.name}")
    t0 = time.time()
    try:
        inserted, skipped = import_npa_websites_from_csv(default_csv)
    except FileNotFoundError as e:
        sys.exit(f"❌ {e}")

    elapsed = time.time() - t0
    print(
        f"\n✅ 完成,耗時 {elapsed:.1f}s\n"
        f"   新增 {inserted:,} 筆 / 略過 {skipped:,} 筆(URL 已存在)"
    )
