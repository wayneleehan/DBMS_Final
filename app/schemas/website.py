from pydantic import BaseModel, Field
from typing import Optional

class WebsiteResponse(BaseModel):
    site_id: int = Field(alias="Site_ID")
    url: str = Field(alias="URL")
    ip_address: Optional[str] = Field(alias="IP_Address")
    status: str = Field(alias="Status")
    risk_score: float = Field(alias="Risk_Score")

    class Config:
        populate_by_name = True