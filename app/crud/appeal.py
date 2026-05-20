from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

def create_appeal(db: Session, report_id: int, reason: str, evidence_link: Optional[str] = None, parent_appeal_id: Optional[int] = None) -> int:
    """
    建立新的申訴案件。若為再審，則關聯 Parent_Appeal_ID。
    """
    query = text("""
        INSERT INTO APPEAL (Report_ID, Reason, Status, Parent_Appeal_ID, Evidence_Link)
        VALUES (:report_id, :reason, 'Pending', :parent_appeal_id, :evidence_link)
    """)
    
    result = db.execute(query, {
        "report_id": report_id,
        "reason": reason,
        "parent_appeal_id": parent_appeal_id,
        "evidence_link": evidence_link
    })
    db.commit()
    
    # 回傳剛新增成功的那一筆 Appeal_ID
    return result.lastrowid

def get_appeal_full_details(db: Session, appeal_id: int) -> dict:
    """
    管理員審核時，透過 JOIN 查詢全面審視案件資訊。
    包含：申訴理由、原始檢舉證據、伺服器資訊，若是再申訴則嘗試抓取歷史裁決。
    """
    query = text("""
        SELECT 
            A.Appeal_ID, A.Reason as Appeal_Reason, A.Evidence_Link, A.Status as Appeal_Status, A.Parent_Appeal_ID,
            R.Report_ID, R.Evidence_Path as Original_Report_Evidence, R.User_ID as Reporter_ID,
            W.Site_ID, W.URL, W.Status as Website_Status, W.Risk_Score,
            S.IP_Address, S.Country, S.ISP,
            PR.Result as Parent_Ruling_Result
        FROM APPEAL A
        JOIN Report R ON A.Report_ID = R.Report_ID
        JOIN WEBSITE W ON R.Site_ID = W.Site_ID
        LEFT JOIN SERVER_INFO S ON W.IP_Address = S.IP_Address
        LEFT JOIN ruling PR ON A.Parent_Appeal_ID = PR.Appeal_ID
        WHERE A.Appeal_ID = :appeal_id
    """)
    row = db.execute(query, {"appeal_id": appeal_id}).mappings().first()
    return dict(row) if row else None

def update_appeal_status(db: Session, appeal_id: int, status: str):
    """
    裁決後執行 UPDATE 將狀態標記為 Approved 或 Rejected。
    """
    query = text("UPDATE APPEAL SET Status = :status WHERE Appeal_ID = :appeal_id")
    db.execute(query, {"status": status, "appeal_id": appeal_id})
