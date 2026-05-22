"""目前登入使用者的個人資料端點(個人頁用)。

注意 prefix 跟其他 v1 endpoints 對齊;路徑用 /users/me/* 表示「目前這個人」,
這樣未來要做「依 user_id 查任意使用者」時可以加 /users/{user_id}/* 而不衝突。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_user
from app.core.database import get_db
from app.crud import report as report_crud
from app.schemas.report import UserReportRow, UserReportStats

router = APIRouter(prefix="/api/v1/users", tags=["Users"])


@router.get("/me/reports", response_model=list[UserReportRow])
def get_my_reports(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_user),
):
    """目前登入者的近期通報紀錄(時間倒序)。"""
    rows = report_crud.get_reports_with_website_by_user(
        db, user_id=current_user["id"], limit=limit
    )
    # 轉 key 從 DB 欄名(Pascal)→ 前端友善(snake)
    return [
        {
            "report_id": r["Report_ID"],
            "url": r["URL"],
            "category": r["Category"],
            "reason": r["Reason"],
            "status": r["Status"],
            "risk_score": float(r["Risk_Score"] or 0),
            "timestamp": r["Timestamp"],
        }
        for r in rows
    ]


@router.get("/me/stats", response_model=UserReportStats)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_user),
):
    """目前登入者的通報統計(個人頁卡片用)。"""
    return report_crud.get_user_report_stats(db, user_id=current_user["id"])
