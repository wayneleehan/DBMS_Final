from sqlalchemy.orm import Session
from sqlalchemy import text

def get_ip_block_stats(db: Session, ip_address: str) -> dict:
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

def batch_increase_risk_score_by_ip(db: Session, ip_address: str, score_increment: float):
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

def force_manual_review(db: Session, site_id: int):
    """
    暫停自動封鎖功能，強制轉入人工審核流程 (將狀態設為 Warning)
    """
    query = text("""
        UPDATE WEBSITE
        SET Status = 'Warning'
        WHERE Site_ID = :site_id AND Status != 'Blocked'
    """)
    db.execute(query, {"site_id": site_id})
    db.commit()