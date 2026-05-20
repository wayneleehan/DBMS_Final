from sqlalchemy.orm import Session
from sqlalchemy import text

def create_ruling(db: Session, admin_id: int, appeal_id: int, result: str):
    """
    新增管理員的裁決紀錄
    """
    query = text("""
        INSERT INTO ruling (Admin_ID, Appeal_ID, Result)
        VALUES (:admin_id, :appeal_id, :result)
    """)
    db.execute(query, {"admin_id": admin_id, "appeal_id": appeal_id, "result": result})