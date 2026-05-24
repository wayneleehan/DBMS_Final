from sqlalchemy import text
from sqlalchemy.orm import Session


def get_admin_by_email(db: Session, email: str) -> dict | None:
    # 暫時用 Name 當作 email 查詢（測試用）
    row = db.execute(
        text("""
            SELECT Admin_ID, Name, Role
            FROM ADMIN WHERE Name = :email
        """),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def get_admin_by_id(db: Session, admin_id: int) -> dict | None:
    row = db.execute(
        text("""
            SELECT Admin_ID, Name, Role
            FROM ADMIN WHERE Admin_ID = :admin_id
        """),
        {"admin_id": admin_id},
    ).mappings().first()
    return dict(row) if row else None