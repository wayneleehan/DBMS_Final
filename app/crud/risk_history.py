from sqlalchemy import text, Connection

def create_risk_history(db: Connection, site_id: int, old_score: float, new_score: float):
    """
    紀錄網址風險值的變動歷程。
    """
    query = text("""
        INSERT INTO Risk_History (Site_ID, Old_score, New_score)
        VALUES (:site_id, :old_score, :new_score)
    """)
    db.execute(query, {"site_id": site_id, "old_score": old_score, "new_score": new_score})
    db.commit()


def create_history(db: Connection, site_id: int, old_score: float, new_score: float):
    sql = text("""
        INSERT INTO risk_history (Site_ID, Old_score, New_score, Timestamp) 
        VALUES (:site_id, :old, :new, CURRENT_TIMESTAMP)
    """)
    db.execute(sql, {"site_id": site_id, "old": old_score, "new": new_score})
    db.commit()