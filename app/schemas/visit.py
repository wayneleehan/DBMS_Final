from datetime import datetime

from pydantic import BaseModel


class VisitCreate(BaseModel):
    url: str
    visited_at: datetime | None = None


class VisitResponse(BaseModel):
    url: str
    status: str
    risk_score: float
    is_new: bool  # True = 首次造訪、剛由評分系統建立;False = DB 既有資料
