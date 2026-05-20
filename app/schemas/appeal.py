from pydantic import BaseModel, Field
from typing import Optional

class AppealCreateRequest(BaseModel):
    report_id: int = Field(..., description="被檢舉案件的 Report_ID")
    reason: str = Field(..., description="申訴理由")
    evidence_link: Optional[str] = Field(None, description="外部證據連結 (URL)")
    parent_appeal_id: Optional[int] = Field(None, description="若為再申訴，需提供原始申訴的 ID")
    contact_info: Optional[str] = Field(None, description="申訴人聯絡資訊") # 備註：企劃書有提，但預設 DB 結構未見此欄位，由 API 暫存或延伸使用

class AppealResponse(BaseModel):
    status: str
    message: str
    appeal_id: Optional[int] = None