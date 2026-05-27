from sqlalchemy import text, Connection

def create_alert_log(db: Connection, alert_type: str, target_id: str, description: str):
    """
    寫入系統預警紀錄 (Alert_Logs)。交易控制由呼叫端負責 commit。
    """
    query = text("""
        INSERT INTO ALERT_LOGS (Alert_Type, Target_ID, Description)
        VALUES (:alert_type, :target_id, :description)
    """)
    db.execute(query, {
        "alert_type": alert_type,
        "target_id": target_id,
        "description": description
    })