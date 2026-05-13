from sqlalchemy import text
from sqlalchemy.orm import Session

def create_history(db: Session, site_id: int, old_score: float, new_score: float):
    sql = text("""
        INSERT INTO risk_history (Site_ID, Old_score, New_score, Timestamp) 
        VALUES (:site_id, :old, :new, CURRENT_TIMESTAMP)
    """)
    db.execute(sql, {"site_id": site_id, "old": old_score, "new": new_score})
    db.commit()