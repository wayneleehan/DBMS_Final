from sqlalchemy import text, Connection

def create_ruling(db: Connection, admin_id: int, appeal_id: int, result: str):
    """
    新增管理員的裁決紀錄。交易控制由呼叫端負責 commit。
    """
    query = text("""
        INSERT INTO ruling (Admin_ID, Appeal_ID, Result)
        VALUES (:admin_id, :appeal_id, :result)
    """)
    db.execute(query, {"admin_id": admin_id, "appeal_id": appeal_id, "result": result})