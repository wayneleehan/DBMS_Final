from sqlalchemy.orm import Session
from sqlalchemy import text

def update_website_status_and_score(db: Session, site_id: int, status: str, score: float):
    """
    管理員裁決後，更新特定網站的狀態與風險值。
    - 申訴通過 (Approved)：退回 'Safe'，分數歸零。
    - 申訴駁回 (Rejected)：維持 'Blocked' 等狀態。
    """
    query = text("""
        UPDATE WEBSITE 
        SET Status = :status, Risk_Score = :score
        WHERE Site_ID = :site_id
    """)
    db.execute(query, {"site_id": site_id, "status": status, "score": score})