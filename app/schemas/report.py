from datetime import datetime

from pydantic import BaseModel


class ReportCreate(BaseModel):
    url: str
    reported_at: datetime | None = None
    ip_address: str | None = None  # 由 extension 用 DOH 解析得到;沒有則由後端 DNS lookup
    category: str | None = None    # 可疑類型(如「假冒官方網站」)
    reason: str | None = None      # 使用者文字描述


class ReportResponse(BaseModel):
    url: str
    status: str
    risk_score: float
    is_new: bool  # True = 首次被通報、剛由評分系統建立;False = DB 既有資料


class UserReportRow(BaseModel):
    """個人頁紀錄表單列。Status / Risk_Score 是該網站「目前」的狀態(可能晚於通報當下)。"""
    report_id: int
    url: str
    category: str | None
    reason: str | None
    status: str          # WEBSITE.Status: 'Safe' / 'Low_Risk' / 'Warning' / 'Blocked'
    risk_score: float
    timestamp: datetime


class UserReportStats(BaseModel):
    total: int       # 通報總筆數
    approved: int    # 對應網站被判為 Blocked / Warning 的不重複站數
    rejected: int    # 對應網站被判為 Safe 的不重複站數
    appeals: int     # 關聯到使用者通報的申訴筆數
