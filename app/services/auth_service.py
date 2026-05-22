"""認證業務邏輯(密碼 hash、登入驗證、登入後組 UserInfo)。

決策摘要(在前期討論已敲定):
- 用 cookie session(不用 JWT)
- 註冊完直接可登入,不寄驗證信(方案 C)
- ADMIN 維持獨立表
- 登入時連同 user info 一起回
"""

import bcrypt
from sqlalchemy.orm import Session

from app.crud import admin as admin_crud
from app.crud import user as user_crud


# ------------------------------------------------------------------
# 密碼雜湊
# ------------------------------------------------------------------

def hash_password(plain: str) -> str:
    """產生 bcrypt hash(自帶 salt)。"""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """驗證明文密碼是否符合 hash。任何例外都當失敗,不洩漏錯誤型別。"""
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ------------------------------------------------------------------
# 登入流程
# ------------------------------------------------------------------

def authenticate(db: Session, role: str, email: str, password: str) -> dict | None:
    """驗證身分,回傳 UserInfo dict(已剝除 Password_Hash)。失敗回 None。"""
    email = email.strip().lower()

    if role == "user":
        record = user_crud.get_user_by_email(db, email)
        if not record or not verify_password(password, record.get("Password_Hash", "")):
            return None
        return _user_to_info(record)

    if role == "admin":
        record = admin_crud.get_admin_by_email(db, email)
        if not record or not verify_password(password, record.get("Password_Hash", "")):
            return None
        return _admin_to_info(record)

    return None  # 不支援的 role


def restore_session_user(db: Session, role: str, principal_id: int) -> dict | None:
    """依 session 裡的 (role, id) 重新查 DB 還原 UserInfo,給 /auth/me 用。"""
    if role == "user":
        record = user_crud.get_user_by_id(db, principal_id)
        return _user_to_info(record) if record else None
    if role == "admin":
        record = admin_crud.get_admin_by_id(db, principal_id)
        return _admin_to_info(record) if record else None
    return None


# ------------------------------------------------------------------
# DB row → 前端友善的 UserInfo dict
# ------------------------------------------------------------------

def _user_to_info(row: dict) -> dict:
    return {
        "id": row["User_ID"],
        "role": "user",
        "email": row["Email"],
        "name": row["Name"],
        "reliability_score": float(row.get("Reliability_Score") or 0),
        "admin_role": None,
        "created_at": row["Created_At"],
    }


def _admin_to_info(row: dict) -> dict:
    return {
        "id": row["Admin_ID"],
        "role": "admin",
        "email": row["Email"],
        "name": row["Name"],
        "reliability_score": None,
        "admin_role": row.get("Role"),
        "created_at": row["Created_At"],
    }
