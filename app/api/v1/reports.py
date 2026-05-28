from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, HTTPException, Form
from typing import Optional, List
from sqlalchemy import Connection
from datetime import datetime

from app.api.deps import require_user
from app.core.database import get_db
from app.schemas.report import ReportResponse ##因為要傳檔案-> using Form Data, 不需要用到ReportCreate
from app.services.report_service import handle_report

router = APIRouter(prefix="/api/v1", tags=["reports"])


@router.post("/reports", response_model=ReportResponse)
async def create_report(
    background_tasks: BackgroundTasks,
    db: Connection = Depends(get_db),
    current_user: dict = Depends(require_user),
    url: str = Form(...),
    category: Optional[str] = Form(None),
    reason: Optional[str] = Form(None),
    reported_at: Optional[datetime] = Form(None),
    ip_address: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
):
    """提交通報。需登入(一般使用者)。
    user_id 從 session 拿,client 端不能自己指定避免冒名通報。
    """
    
    try:
        return await handle_report(
            db=db,
            user_id=current_user["id"],
            url=url,
            reported_at=reported_at,
            background_tasks=background_tasks,
            ip_address=ip_address,
            category=category,
            reason=reason,
            files=files,  # s3 file upload
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"提交申訴失敗，伺服器發生錯誤: {str(e)}")