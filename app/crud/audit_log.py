import json
from sqlalchemy import text, Connection

def create_audit_log(db: Connection, admin_id: int, action_type: str, old_data: dict, new_data: dict):
    """
    紀錄管理員執行的每一筆手動干預。交易控制由呼叫端負責 commit。
    """
    query = text("""
        INSERT INTO AUDIT_LOG (Admin_ID, Action_Type, Old_Data, New_Data)
        VALUES (:admin_id, :action_type, :old_data, :new_data)
    """)
    db.execute(query, {
        "admin_id": admin_id,
        "action_type": action_type,
        "old_data": json.dumps(old_data),
        "new_data": json.dumps(new_data)
    })