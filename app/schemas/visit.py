from datetime import datetime

from pydantic import BaseModel


class VisitCreate(BaseModel):
    url: str
    visited_at: datetime | None = None
