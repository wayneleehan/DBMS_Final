from fastapi import APIRouter, Depends, Query
from sqlalchemy import Connection

from app.api.deps import require_admin
from app.core.database import get_db
from app.schemas.early_warning import CIBMonitorRequest, ClusterMonitorRequest, WarningResponse
from app.services import early_warning
from sqlalchemy import text


router = APIRouter(prefix="/api/v1/warnings", tags=["Early Warning System"])


@router.post("/cib", response_model=WarningResponse)
def trigger_cib_monitor(
    request: CIBMonitorRequest,
    db: Connection = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """觸發協同造假防禦監控 (Monitor)。需管理員。"""
    result = early_warning.monitor_cib_attack(db, site_id=request.site_id)
    return WarningResponse(
        status="success",
        message="CIB 監控執行完畢",
        alert_triggered=result["alert_triggered"],
        details=result["details"]
    )


@router.post("/cluster", response_model=WarningResponse)
def trigger_cluster_monitor(
    request: ClusterMonitorRequest,
    db: Connection = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    """觸發機房集群預警監控 (Monitor)。需管理員。
    由於涉及 IP 關聯查詢,已確保在 Websites.IP_Address 建立索引以維持即時性。
    """
    result = early_warning.monitor_cluster_warning(db, ip_address=request.ip_address)
    return WarningResponse(
        status="success",
        message="機房集群監控執行完畢",
        alert_triggered=result["alert_triggered"],
        details=result["details"]
    )

@router.get("/alerts")
def get_alerts(
    limit: int = Query(50, ge=1, le=200),
    db: Connection = Depends(get_db),
    _admin: dict = Depends(require_admin),
):
    rows = db.execute(text("""
        SELECT Alert_ID, Alert_Type, Target_ID, Description, Timestamp
        FROM alert_logs
        ORDER BY Timestamp DESC
        LIMIT :limit
    """), {"limit": limit}).mappings().all()
    return [
        {
            "id": f"ALERT-{r['Alert_ID']}",
            "type": r["Alert_Type"],
            "desc": r["Description"],
            "related": r["Target_ID"],
            "time": r["Timestamp"].strftime("%Y-%m-%d %H:%M") if r["Timestamp"] else "—",
        }
        for r in rows
    ]