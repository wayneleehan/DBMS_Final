import csv
import sys
import time
from pathlib import Path

from sqlalchemy import text, Connection

from app.core.database import engine


def update_website_status_and_score(db: Connection, site_id: int, status: str, score: float):
    """
    管理員裁決後,更新特定網站的狀態與風險值。
    - 申訴通過 (Approved):退回 'Safe',分數歸零。
    - 申訴駁回 (Rejected):維持 'Blocked' 等狀態。
    """
    query = text("""
        UPDATE WEBSITE
        SET Status = :status, Risk_Score = :score
        WHERE Site_ID = :site_id
    """)
    db.execute(query, {"site_id": site_id, "status": status, "score": score})
    db.commit()


def get_ip_block_stats(db: Connection, ip_address: str) -> dict:
    """
    計算特定 IP_Address 下已封鎖網站的比例
    """
    query = text("""
        SELECT
            COUNT(*) as total_sites,
            SUM(CASE WHEN Status = 'Blocked' THEN 1 ELSE 0 END) as blocked_sites
        FROM WEBSITE
        WHERE IP_Address = :ip_address
    """)
    row = db.execute(query, {"ip_address": ip_address}).mappings().first()
    return dict(row) if row else {"total_sites": 0, "blocked_sites": 0}


def batch_increase_risk_score_by_ip(db: Connection, ip_address: str, score_increment: float):
    """
    批量更新該 IP 下所有未封鎖網址的 Risk_Score
    """
    query = text("""
        UPDATE WEBSITE
        SET Risk_Score = Risk_Score + :increment,
            Status = CASE WHEN Risk_Score + :increment >= 80 THEN 'Warning' ELSE Status END
        WHERE IP_Address = :ip_address AND Status != 'Blocked'
    """)
    db.execute(query, {"ip_address": ip_address, "increment": score_increment})
    db.commit()


def force_manual_review(db: Connection, site_id: int):
    """
    暫停自動封鎖功能,強制轉入人工審核流程 (將狀態設為 Warning)
    """
    query = text("""
        UPDATE WEBSITE
        SET Status = 'Warning'
        WHERE Site_ID = :site_id AND Status != 'Blocked'
    """)
    db.execute(query, {"site_id": site_id})
    db.commit()


def create_website(
    db: Connection,
    url: str,
    ip: str | None,
    status: str,
    risk_score: float,
) -> int:
    """新增一筆 WEBSITE,回傳 Site_ID。

    呼叫端要保證 URL 不存在(否則 UNIQUE 衝突會炸)。
    `ip` 可以是 None,DB 欄位會存 NULL。
    """
    result = db.execute(
        text("""
            INSERT INTO WEBSITE (URL, IP_Address, Status, Risk_Score)
            VALUES (:url, :ip, :status, :score)
        """),
        {"url": url, "ip": ip, "status": status, "score": risk_score},
    )
    db.commit()
    return result.lastrowid


def update_website_score(db: Connection, site_id: int, score: float, status: str):
    sql = text("""
        UPDATE WEBSITE
        SET Risk_Score = :score, Status = :status
        WHERE Site_ID = :site_id
    """)
    db.execute(sql, {"score": score, "status": status, "site_id": site_id})
    db.commit()


def get_website_by_url(db: Connection, url: str):
    sql = text("SELECT Site_ID, URL, IP_Address, Status, Risk_Score FROM WEBSITE WHERE URL = :url")
    return db.execute(sql, {"url": url}).mappings().first()


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
    # 從專案根直接執行:uv run python -m app.crud.website
    project_root = Path(__file__).resolve().parents[2]
    default_csv = project_root / "NPA_WEBURL.csv"

    print(f" 讀取 {default_csv.name}")
    t0 = time.time()
    try:
        inserted, skipped = import_npa_websites_from_csv(default_csv)
    except FileNotFoundError as e:
        sys.exit(f" {e}")

    elapsed = time.time() - t0
    print(
        f"\n 完成,耗時 {elapsed:.1f}s\n"
        f"   新增 {inserted:,} 筆 / 略過 {skipped:,} 筆(URL 已存在)"
    )
