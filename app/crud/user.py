from sqlalchemy.orm import Session
from sqlalchemy import text


def get_user_by_email(db: Session, email: str) -> dict | None:
    row = db.execute(
        text("""
            SELECT User_ID, Email, Password_Hash, Reliability_Score
            FROM USERS WHERE Email = :email
        """),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def get_user_by_id(db: Session, user_id: int) -> dict | None:
    row = db.execute(
        text("""
            SELECT User_ID, Email, Reliability_Score
            FROM USERS WHERE User_ID = :user_id
        """),
        {"user_id": user_id},
    ).mappings().first()
    return dict(row) if row else None


def create_user(db: Session, email: str, name: str, password_hash: str) -> int:
    result = db.execute(
        text("""
            INSERT INTO USERS (Email, Password_Hash)
            VALUES (:email, :pwd_hash)
        """),
        {"email": email, "pwd_hash": password_hash},
    )
    db.commit()
    return result.lastrowid

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
def update_reliability_score(db: Session, user_id: int, delta: float):
    
    sql = text("""
        UPDATE USERS  
        SET Reliability_Score = LEAST(100, GREATEST(0, Reliability_Score + :delta))
        WHERE User_ID = :user_id
    """)
    db.execute(sql, {"delta": delta, "user_id": user_id})
    db.commit()
