from sqlalchemy import text
from sqlalchemy.orm import Session

def create_evaluation(db: Session, site_id: int, pattern_id: int):
    sql = text("""
        INSERT INTO evaluation (Site_ID, Pattern_ID) 
        VALUES (:site_id, :pattern_id)
    """)
    db.execute(sql, {"site_id": site_id, "pattern_id": pattern_id})
    db.commit()

def check_evaluation_exists(db: Session, site_id: int, pattern_id: int):
    sql = text("""
        SELECT 1 FROM evaluation 
        WHERE Site_ID = :site_id AND Pattern_ID = :pattern_id 
        LIMIT 1
    """)
    return db.execute(sql, {"site_id": site_id, "pattern_id": pattern_id}).first() is not None