from pydantic import BaseModel, Field
from typing import Optional

class AdminReviewRequest(BaseModel):
    admin_id: int = Field(..., description="執行審核的管理員 ID")
    appeal_id: int = Field(..., description="正在審核的申訴案件 ID")
    decision: str = Field(..., description="裁決結果：'Approved' (同意解封) 或 'Rejected' (駁回申訴)")
    ruling_result: str = Field(..., description="管理員留下的處置意見與理由")
    is_unreasonable: bool = Field(False, description="若駁回，是否判定為惡意虛假申訴 (將扣除信譽分)")

class AdminReviewResponse(BaseModel):
    status: str
    message: str