from sqlalchemy.orm import Session
from sqlalchemy import text

def update_reliability_score(db: Session, user_id: int, delta: float):
    
    sql = text("""
        UPDATE users 
        SET Reliability_Score = LEAST(100, GREATEST(0, Reliability_Score + :delta))
        WHERE User_ID = :user_id
    """)
    db.execute(sql, {"delta": delta, "user_id": user_id})
    db.commit()