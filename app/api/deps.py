"""共用的 FastAPI dependencies(目前主要為 auth 守門)。

任何 endpoint 想要求「必須登入」,寫:
    @router.post(...)
    def my_endpoint(user: dict = Depends(require_user)):
        # user 是 UserInfo dict:{id, role, email, name, ...}
        ...

只允許特定角色用 `require_user` / `require_admin`,通用「必須登入」用 `require_login`。
"""

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import auth_service


def require_login(request: Request, db: Session = Depends(get_db)) -> dict:
    """要求請求已登入,回傳完整 UserInfo dict。

    未登入(沒 session)→ 401
    session 對應不到 DB(帳號被刪)→ 401,順手清掉壞掉的 session
    """
    role = request.session.get("role")
    principal_id = request.session.get("principal_id")
    if not role or not principal_id:
        raise HTTPException(status_code=401, detail="需要先登入")

    info = auth_service.restore_session_user(db, role, principal_id)
    if info is None:
        request.session.clear()
        raise HTTPException(status_code=401, detail="登入狀態已失效,請重新登入")
    return info


def require_user(current: dict = Depends(require_login)) -> dict:
    """只允許一般使用者(非管理員)。"""
    if current["role"] != "user":
        raise HTTPException(status_code=403, detail="此 API 僅限一般使用者")
    return current


def require_admin(current: dict = Depends(require_login)) -> dict:
    """只允許管理員。"""
    if current["role"] != "admin":
        raise HTTPException(status_code=403, detail="此 API 僅限管理員")
    return current
