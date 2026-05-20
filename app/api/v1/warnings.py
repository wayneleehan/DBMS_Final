from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.early_warning import CIBMonitorRequest, ClusterMonitorRequest, WarningResponse
from app.services import early_warning

router = APIRouter(prefix="/api/v1/warnings", tags=["Early Warning System"])

@router.post("/cib", response_model=WarningResponse)
def trigger_cib_monitor(request: CIBMonitorRequest, db: Session = Depends(get_db)):
    """
    觸發協同造假防禦監控 (Monitor)
    """
    result = early_warning.monitor_cib_attack(db, site_id=request.site_id)
    
    return WarningResponse(
        status="success",
        message="CIB 監控執行完畢",
        alert_triggered=result["alert_triggered"],
        details=result["details"]
    )

@router.post("/cluster", response_model=WarningResponse)
def trigger_cluster_monitor(request: ClusterMonitorRequest, db: Session = Depends(get_db)):
    """
    觸發機房集群預警監控 (Monitor)
    由於涉及 IP 關聯查詢，已確保在 Websites.IP_Address 建立索引以維持即時性 [cite: 44]。
    """
    result = early_warning.monitor_cluster_warning(db, ip_address=request.ip_address)
    
    return WarningResponse(
        status="success",
        message="機房集群監控執行完畢",
        alert_triggered=result["alert_triggered"],
        details=result["details"]
    )