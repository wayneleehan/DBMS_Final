from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class LoginRequest(BaseModel):
    role: Literal["user", "admin"]
    email: str
    password: str
    remember: bool = False


class UserInfo(BaseModel):
    """登入成功後一起回給前端的個人資料,共用於 user / admin。"""
    id: int                   # User_ID 或 Admin_ID
    role: Literal["user", "admin"]
    email: str
    name: str
    reliability_score: float | None = None  # 只有 user 有
    admin_role: str | None = None           # 只有 admin 有(Moderator / SuperAdmin)
    created_at: datetime | None = None


class LoginResponse(BaseModel):
    ok: bool
    user: UserInfo
    csrf_token: str | None = None


class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str  # 後端再 hash;前端應已做長度檢查


class LogoutResponse(BaseModel):
    ok: bool
