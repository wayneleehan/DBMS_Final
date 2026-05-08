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