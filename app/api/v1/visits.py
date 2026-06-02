import time
from collections import defaultdict, deque

from fastapi import APIRouter, BackgroundTasks, Depends
from fastapi import HTTPException, Request
from sqlalchemy import Connection

from app.core.database import get_db
from app.schemas.visit import VisitCreate, VisitResponse
from app.services import auth_service
from app.services.visits_checking import check_visit

router = APIRouter(prefix="/api/v1", tags=["visits"])

_VISIT_WINDOW_SECONDS = 60
_VISIT_MAX_REQUESTS = 60
_visit_attempts: dict[str, deque[float]] = defaultdict(deque)


def _check_visit_rate_limit(request: Request):
    client_host = request.client.host if request.client else "unknown"
    now = time.monotonic()
    attempts = _visit_attempts[client_host]

    while attempts and now - attempts[0] > _VISIT_WINDOW_SECONDS:
        attempts.popleft()

    if len(attempts) >= _VISIT_MAX_REQUESTS:
        raise HTTPException(status_code=429, detail="造訪檢查請求過於頻繁,請稍後再試")

    attempts.append(now)


def _optional_user_id(request: Request, db: Connection) -> int | None:
    role = request.session.get("role")
    principal_id = request.session.get("principal_id")
    if role != "user" or not principal_id:
        return None

    info = auth_service.restore_session_user(db, role, principal_id)
    if info is None:
        request.session.clear()
        return None
    return int(info["id"])


@router.post("/visits", response_model=VisitResponse)
def create_visit(
    request: Request,
    payload: VisitCreate,
    background_tasks: BackgroundTasks,
    db: Connection = Depends(get_db),
):
    _check_visit_rate_limit(request)
    return check_visit(
        db,
        url=payload.url,
        visited_at=payload.visited_at,
        background_tasks=background_tasks,
        ip_address=payload.ip_address,
        user_id=_optional_user_id(request, db),
    )
