from datetime import datetime

from pydantic import BaseModel


class ReportCreate(BaseModel):
    url: str
    reported_at: datetime | None = None
    ip_address: str | None = None  # 由 extension 用 DOH 解析得到;沒有則由後端 DNS lookup


class ReportResponse(BaseModel):
    url: str
    status: str
    risk_score: float
    is_new: bool  # True = 首次被通報、剛由評分系統建立;False = DB 既有資料
