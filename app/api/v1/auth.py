"""Auth endpoints:登入 / 登出 / 取得目前登入者 / 註冊。

Cookie session 機制由 starlette.middleware.sessions.SessionMiddleware 處理
(在 main.py 註冊),這裡只負責讀寫 request.session 字典。
"""

import time
import secrets
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import Connection

from app.core.database import get_db
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RegisterRequest,
    UserInfo,
)
from app.services import auth_service
from app.crud import user as user_crud

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

CSRF_SESSION_KEY = "csrf_token"
_LOGIN_WINDOW_SECONDS = 5 * 60
_LOGIN_MAX_ATTEMPTS = 5
_login_attempts: dict[tuple[str, str], deque[float]] = defaultdict(deque)


def ensure_csrf_token(request: Request) -> str:
    token = request.session.get(CSRF_SESSION_KEY)
    if not token:
        token = secrets.token_urlsafe(32)
        request.session[CSRF_SESSION_KEY] = token
    return token


def _login_rate_key(request: Request, email: str) -> tuple[str, str]:
    client_host = request.client.host if request.client else "unknown"
    return (client_host, email.strip().lower())


def _check_login_rate_limit(request: Request, email: str):
    key = _login_rate_key(request, email)
    now = time.monotonic()
    attempts = _login_attempts[key]

    while attempts and now - attempts[0] > _LOGIN_WINDOW_SECONDS:
        attempts.popleft()

    if len(attempts) >= _LOGIN_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="登入嘗試過於頻繁,請稍後再試")


def _record_failed_login(request: Request, email: str):
    _login_attempts[_login_rate_key(request, email)].append(time.monotonic())


def _clear_failed_logins(request: Request, email: str):
    _login_attempts.pop(_login_rate_key(request, email), None)


@router.post("/login", response_model=LoginResponse)
def login(request: Request, payload: LoginRequest, db: Connection = Depends(get_db)):
    """登入。成功後在 cookie session 寫入 {role, principal_id},並回傳 UserInfo。"""
    _check_login_rate_limit(request, payload.email)
    info = auth_service.authenticate(db, payload.role, payload.email, payload.password)
    if info is None:
        _record_failed_login(request, payload.email)
        # 統一錯誤訊息,不洩漏「帳號不存在」還是「密碼錯誤」
        raise HTTPException(status_code=401, detail="帳號或密碼錯誤,請確認後重新輸入")

    _clear_failed_logins(request, payload.email)
    request.session["role"] = info["role"]
    request.session["principal_id"] = info["id"]
    return LoginResponse(ok=True, user=UserInfo(**info), csrf_token=ensure_csrf_token(request))


@router.post("/logout", response_model=LogoutResponse)
def logout(request: Request):
    """登出。直接清空 session cookie。"""
    request.session.clear()
    return LogoutResponse(ok=True)


@router.get("/me", response_model=UserInfo)
def get_me(request: Request, db: Connection = Depends(get_db)):
    """回傳目前登入者的 UserInfo(用 session 還原)。沒登入回 401。"""
    role = request.session.get("role")
    principal_id = request.session.get("principal_id")
    if not role or not principal_id:
        raise HTTPException(status_code=401, detail="尚未登入")

    info = auth_service.restore_session_user(db, role, principal_id)
    if info is None:
        # session 裡的 id 對應不到 DB(可能帳號被刪),清掉 session 並要求重登
        request.session.clear()
        raise HTTPException(status_code=401, detail="登入狀態已失效,請重新登入")
    return UserInfo(**info)


@router.get("/csrf")
def get_csrf_token(request: Request):
    """回傳目前 session 的 CSRF token。需已登入。"""
    if not request.session.get("principal_id"):
        raise HTTPException(status_code=401, detail="尚未登入")
    return {"csrf_token": ensure_csrf_token(request)}


@router.post("/register", response_model=LoginResponse, status_code=201)
def register(request: Request, payload: RegisterRequest, db: Connection = Depends(get_db)):
    """註冊新使用者(不寄驗證信,直接可登入)。
    成功後自動建立 session,跟 /login 一樣回傳 UserInfo。
    """
    email = payload.email.strip().lower()
    name = payload.name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="顯示名稱不可為空")
    if len(payload.password) < 8:
        raise HTTPException(status_code=400, detail="密碼至少 8 個字元")

    # 檢查 email 是否已被註冊
    if user_crud.get_user_by_email(db, email):
        raise HTTPException(status_code=409, detail="此 Email 已被註冊")

    user_id, info = auth_service.register_user(
        db, email=email, name=name, password=payload.password
    )

    # 註冊完直接登入
    request.session["role"] = "user"
    request.session["principal_id"] = user_id

    return LoginResponse(ok=True, user=UserInfo(**info), csrf_token=ensure_csrf_token(request))
