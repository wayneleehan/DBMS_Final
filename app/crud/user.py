from sqlalchemy.orm import Session
from sqlalchemy import text

def deduct_reliability_score(db: Session, user_id: int, deduct_points: float = 30.0):
    """
    若判定為「無理取鬧」，加重扣除使用者的信譽分。
    """
    query = text("""
        UPDATE USERS 
        SET Reliability_Score = GREATEST(Reliability_Score - :deduct_points, 0)
        WHERE User_ID = :user_id
    """)
    db.execute(query, {"user_id": user_id, "deduct_points": deduct_points})