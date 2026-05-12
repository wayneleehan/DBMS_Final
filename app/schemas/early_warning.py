from pydantic import BaseModel
from typing import Optional

class CIBMonitorRequest(BaseModel):
    site_id: int

class ClusterMonitorRequest(BaseModel):
    ip_address: str

class WarningResponse(BaseModel):
    status: str
    message: str
    alert_triggered: bool
    details: Optional[dict] = None