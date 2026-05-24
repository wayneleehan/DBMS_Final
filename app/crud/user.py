from sqlalchemy import text, Connection


def get_user_by_email(db: Connection, email: str) -> dict | None:
    """依 Email 查使用者,有就回 dict(含 Password_Hash),沒有回 None。
    給登入流程使用。
    """
    row = db.execute(
        text("""
            SELECT User_ID, Email, Password_Hash, Reliability_Score
            FROM USERS WHERE Email = :email
        """),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def get_user_by_id(db: Connection, user_id: int) -> dict | None:
    """依 ID 查使用者(不含 Password_Hash,給 session 還原 user info 用)。"""
    row = db.execute(
        text("""
            SELECT User_ID, Email, Reliability_Score
            FROM USERS WHERE User_ID = :user_id
        """),
        {"user_id": user_id},
    ).mappings().first()
    return dict(row) if row else None


def create_user(db: Connection, email: str, name: str, password_hash: str) -> int:
    """新增一筆使用者,回傳 User_ID。Reliability_Score 走 schema 預設(100)。"""
    result = db.execute(
        text("""
            INSERT INTO USERS (Email, Password_Hash)
            VALUES (:email, :pwd_hash)
        """),
        {"email": email, "pwd_hash": password_hash},
    )
    db.commit()
    return result.lastrowid


def deduct_reliability_score(db: Connection, user_id: int, deduct_points: float = 30.0):
    """
    若判定為「無理取鬧」，加重扣除使用者的信譽分。
    """
    query = text("""
        UPDATE USERS 
        SET Reliability_Score = GREATEST(Reliability_Score - :deduct_points, 0)
        WHERE User_ID = :user_id
    """)
    db.execute(query, {"user_id": user_id, "deduct_points": deduct_points})
    db.commit()


def update_reliability_score(db: Connection, user_id: int, delta: float):
    
    sql = text("""
        UPDATE USERS  
        SET Reliability_Score = LEAST(100, GREATEST(0, Reliability_Score + :delta))
        WHERE User_ID = :user_id
    """)
    db.execute(sql, {"delta": delta, "user_id": user_id})
    db.commit()