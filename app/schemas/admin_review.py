from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AdminReviewRequest(BaseModel):
    # admin_id 不再從 client 帶,改由 session 提供(避免冒名),由 API 層注入給 service
    appeal_id: int = Field(..., description="正在審核的申訴案件 ID")
    decision: str = Field(..., description="裁決結果:'Approved' (同意解封) 或 'Rejected' (駁回申訴)")
    ruling_result: str = Field(..., description="管理員留下的處置意見與理由")
    is_unreasonable: bool = Field(False, description="若駁回,是否判定為惡意虛假申訴 (將扣除信譽分)")

class AdminReviewResponse(BaseModel):
    status: str
    message: str


class ReviewQueueItem(BaseModel):
    """審核佇列的一筆 case(可能是舉報或申訴)。"""
    case_id: str                  # "R-000042" 或 "A-000007",給 UI 顯示
    raw_id: int                   # Report_ID 或 Appeal_ID,給後續操作用
    type: str                     # '舉報' / '申訴'
    case_status: str              # '待審核' / '申訴中'
    url: str
    category: Optional[str] = None
    website_status: str           # WEBSITE.Status enum
    risk_score: float
    reason: Optional[str] = None
    submitted_at: datetime
    submitter_id: int
    submitter_name: str
    submitter_reputation: float


class ReviewQueueCounts(BaseModel):
    pending: int      # 待審核(報告)的件數
    appealing: int    # 申訴中的件數


class ReportVerdictRequest(BaseModel):
    """管理員對「舉報案件」的直接裁決(不經申訴流程)。"""
    report_id: int = Field(..., description="被裁決的 Report_ID")
    verdict: str = Field(..., description="裁決:'safe' / 'warn' / 'danger'")
    note: str = Field(..., description="管理員備註,寫入 AUDIT_LOG")


class ReportVerdictResponse(BaseModel):
    status: str
    message: str
    new_status: str        # 更新後 WEBSITE.Status
    new_risk_score: float