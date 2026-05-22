from sqlalchemy import text
from sqlalchemy.orm import Session


def get_admin_by_email(db: Session, email: str) -> dict | None:
    """依 Email 查管理員,有就回 dict(含 Password_Hash),沒有回 None。
    給登入流程使用。
    """
    row = db.execute(
        text("""
            SELECT Admin_ID, Email, Name, Role, Password_Hash, Created_At
            FROM ADMIN WHERE Email = :email
        """),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def get_admin_by_id(db: Session, admin_id: int) -> dict | None:
    """依 ID 查管理員(不含 Password_Hash,給 session 還原 admin info 用)。"""
    row = db.execute(
        text("""
            SELECT Admin_ID, Email, Name, Role, Created_At
            FROM ADMIN WHERE Admin_ID = :admin_id
        """),
        {"admin_id": admin_id},
    ).mappings().first()
    return dict(row) if row else None
